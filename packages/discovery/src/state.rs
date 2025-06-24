use std::collections::HashMap;

use oxc::{
    ast::ast::{Expression, ObjectPropertyKind, PropertyKey},
    diagnostics::OxcDiagnostic,
    semantic::SymbolId,
    span::{GetSpan, Span},
};
use rand::random;

pub enum Target {
    Client,
    Server,
}

#[derive(Hash, Eq, PartialEq, Debug)]
pub enum MagicFunction {
    Route,
}

pub enum ImportName<'a> {
    Default,
    Named(&'a str),
}

impl MagicFunction {
    pub fn from_import(module: &str, import_name: ImportName) -> Option<MagicFunction> {
        match (module, import_name) {
            ("@vortexjs/wormhole/route", ImportName::Default) => Some(MagicFunction::Route),
            ("@vortexjs/wormhole/route", ImportName::Named("route")) => Some(MagicFunction::Route),
            _ => None,
        }
    }
}

#[napi(string_enum = "camelCase")]
#[derive(Debug)]
pub enum RouteFrame {
    Layout,
    Page,
}

#[napi()]
#[derive(Debug)]
pub enum Discovery {
    Route {
        frame: RouteFrame,
        path: String,
        export: String,
    },
}

pub struct CompilerState<'a> {
    pub target: Target,
    pub errors: Vec<CompilerError>,
    pub magic_function_table: HashMap<SymbolId, MagicFunction>,
    pub source: &'a str,
    pub discoveries: Vec<Discovery>,
}

impl<'a> CompilerState<'a> {
    pub fn new(target: Target, source: &'a str) -> Self {
        Self {
            target,
            errors: Vec::new(),
            magic_function_table: HashMap::new(),
            source,
            discoveries: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: CompilerError) {
        self.errors.push(error);
    }

    pub fn get_object_keys<'b>(
        &mut self,
        object: &'b Expression<'b>,
        keys: &mut HashMap<String, &Expression<'b>>,
    ) {
        let Expression::ObjectExpression(object) = object else {
            self.errors
                .push(CompilerError::ExpectedObject { at: object.span() });
            return;
        };

        for prop in &object.properties {
            let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                self.errors
                    .push(CompilerError::SpreadPropertyNotAllowed { at: prop.span() });
                continue;
            };

            let PropertyKey::StaticIdentifier(key) = &prop.key else {
                self.errors.push(CompilerError::ExpectedStaticPropertyKey {
                    at: prop.key.span(),
                });
                continue;
            };

            keys.insert(key.name.to_string(), &prop.value);
        }
    }

    pub fn get_line(&self, offset: usize) -> usize {
        self.source[..offset].lines().count() - 1
    }

    pub fn line_content(&self, index: usize) -> &str {
        let lines: Vec<&str> = self.source.lines().collect();
        if index < lines.len() {
            lines[index]
        } else {
            ""
        }
    }

    pub fn get_diagnostics(&self) -> Vec<NapiCompilerDiagnostic> {
        let mut diagnostics = vec![];

        for error in &self.errors {
            let mut generator = CompilerDiagnosticGenerator::default();
            generator.format_error(error);
            diagnostics.extend(generator.diagnostics);
        }

        diagnostics
            .into_iter()
            .map(|d| NapiCompilerDiagnostic {
                message: d.message,
                span: (d.span.start, d.span.end),
                tier: d.tier,
                id: d.id,
            })
            .collect()
    }

    pub fn debug_log_errors(&self) {
        let mut diagnostics = vec![];

        for error in &self.errors {
            let mut generator = CompilerDiagnosticGenerator::default();
            generator.format_error(error);
            diagnostics.extend(generator.diagnostics);
        }

        if diagnostics.is_empty() {
            return;
        }

        diagnostics.sort_by_key(|d| d.span.start);

        let line_number_width = 5;

        for diagnostic in diagnostics {
            let line_number = self.get_line(diagnostic.span.start as usize) + 1;
            let line_number_str = format!("{line_number:>line_number_width$}");
            let message = diagnostic.message;
            let line = self.line_content(line_number - 1);

            println!("{line_number_str} | {line} // {message}");
        }
    }

    pub fn get_literal_string<'b>(&mut self, expression: &'b Expression<'b>) -> String {
        let Expression::StringLiteral(literal) = expression else {
            self.errors.push(CompilerError::ExpectedStringLiteral {
                at: expression.span(),
            });
            return "".to_string();
        };
        literal.value.to_string()
    }
}

#[derive(Copy, Clone)]
#[napi(object)]
pub struct DiagnosticId(pub u32);

macro_rules! diagnostic_id {
    () => {
        DiagnosticId(random::<u32>())
    };
}

pub struct CompilerDiagnosticGenerator {
    pub diagnostics: Vec<CompilerDiagnostic>,
}

impl Default for CompilerDiagnosticGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl CompilerDiagnosticGenerator {
    pub fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
        }
    }

    pub fn format_error(&mut self, error: &CompilerError) {
        match error {
            CompilerError::ExpectedPropertiesObject {
                at,
                special_function,
            } => {
                let main = diagnostic_id!();
                self.diagnostics.push(CompilerDiagnostic {
                    id: main,
                    message: "expected an object with parameters".to_string(),
                    span: *at,
                    tier: CompilerDiagnosticTier::Error,
                });
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: "because of this special function call".to_string(),
                    span: *special_function,
                    tier: CompilerDiagnosticTier::Related(main),
                });
            }
            CompilerError::IncorrectNumberOfArguments {
                span,
                expected,
                found,
            } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: format!("expected {expected} arguments, but found {found}"),
                    span: *span,
                    tier: CompilerDiagnosticTier::Error,
                });
            }
            CompilerError::ExpectedObject { at } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: "expected an object".to_string(),
                    span: *at,
                    tier: CompilerDiagnosticTier::Error,
                });
            }
            CompilerError::SpreadPropertyNotAllowed { at } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: "spread properties are not allowed here".to_string(),
                    span: *at,
                    tier: CompilerDiagnosticTier::Error,
                });
            }
            CompilerError::ExpectedStaticPropertyKey { at } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: "expected a static property key".to_string(),
                    span: *at,
                    tier: CompilerDiagnosticTier::Error,
                });
            }
            CompilerError::ExpectedStringLiteral { at } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: "expected a string literal".to_string(),
                    span: *at,
                    tier: CompilerDiagnosticTier::Error,
                });
            }
            CompilerError::OxcParsingError { data } => {
                self.diagnostics.push(CompilerDiagnostic {
                    id: diagnostic_id!(),
                    message: format!("parsing error: {}", data.message),
                    span: data
                        .labels
                        .as_ref()
                        .and_then(|x| x.first())
                        .map(|x| {
                            Span::new(
                                x.inner().offset() as u32,
                                (x.inner().offset() + x.inner().len()) as u32,
                            )
                        })
                        .unwrap_or(Span::new(0, 0)),
                    tier: CompilerDiagnosticTier::Error,
                });
            }
        }
    }
}

pub struct CompilerDiagnostic {
    pub message: String,
    pub span: Span,
    pub tier: CompilerDiagnosticTier,
    pub id: DiagnosticId,
}

#[napi(object)]
pub struct NapiCompilerDiagnostic {
    pub message: String,
    pub span: (u32, u32),
    pub tier: CompilerDiagnosticTier,
    pub id: DiagnosticId,
}

#[napi(string_enum = "camelCase")]
pub enum CompilerDiagnosticTier {
    Error,
    Related(DiagnosticId),
}

pub enum CompilerError {
    ExpectedPropertiesObject {
        at: Span,
        special_function: Span,
    },
    IncorrectNumberOfArguments {
        span: Span,
        expected: i32,
        found: usize,
    },
    ExpectedObject {
        at: Span,
    },
    SpreadPropertyNotAllowed {
        at: Span,
    },
    ExpectedStaticPropertyKey {
        at: Span,
    },
    ExpectedStringLiteral {
        at: Span,
    },
    OxcParsingError {
        data: OxcDiagnostic,
    },
}
