use napi::bindgen_prelude::ToNapiValue;
use oxc::{
    allocator::Allocator,
    ast::ast::{
        BindingRestElement, CallExpression, Expression, FormalParameterKind, ImportDeclaration,
        ImportDeclarationSpecifier, Program, Statement, TSTypeAnnotation,
        TSTypeParameterDeclaration,
    },
    codegen::Codegen,
    parser::Parser,
    semantic::SemanticBuilder,
    span::{SourceType, Span},
};
use oxc_traverse::{traverse_mut, Traverse, TraverseCtx};

use crate::state::{CompilerState, Discovery, ImportName, MagicFunction, Target};

#[macro_use]
extern crate napi_derive;

pub mod route;
pub mod state;

struct DiscoveryTraverser<'a, 'b> {
    state: &'b mut CompilerState<'a>,
    declarations_to_add: Vec<Statement<'a>>,
}

impl<'a> DiscoveryTraverser<'a, '_> {
    fn create_empty_iife(&self, ctx: &mut TraverseCtx<'a>) -> Expression<'a> {
        Expression::ArrowFunctionExpression(oxc::allocator::Box::new_in(
            ctx.ast.arrow_function_expression::<Option<oxc::allocator::Box<'a, TSTypeParameterDeclaration<'a>>>,_,Option<oxc::allocator::Box<'a, TSTypeAnnotation<'a>>>,_>(
                Span::new(0, 0),
                false,
                false,
                None,
                ctx.ast
                    .formal_parameters::<Option<oxc::allocator::Box<'a, BindingRestElement<'a>>>>(
                        Span::new(0, 0),
                        FormalParameterKind::ArrowFormalParameters,
                        ctx.ast.vec(),
                        None,
                    ),
                None,
                ctx.ast.function_body(
                    Span::new(0, 0),
                    ctx.ast.vec(),
                    ctx.ast.vec(),
                ),
            ),
            ctx.ast.allocator,
        ))
    }
}

impl<'a> Traverse<'a> for DiscoveryTraverser<'a, '_> {
    fn exit_program(&mut self, node: &mut Program<'a>, ctx: &mut TraverseCtx<'a>) {
        while let Some(declaration) = self.declarations_to_add.pop() {
            node.body.push(declaration);
        }
    }

    fn enter_import_declaration(
        &mut self,
        node: &mut ImportDeclaration<'a>,
        _: &mut TraverseCtx<'a>,
    ) {
        let import_source = node.source.value.as_str();
        if let Some(specifiers) = &node.specifiers {
            for specifier in specifiers {
                let name = match specifier {
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(_) => ImportName::Default,
                    ImportDeclarationSpecifier::ImportNamespaceSpecifier(_) => ImportName::Default,
                    ImportDeclarationSpecifier::ImportSpecifier(name) => {
                        ImportName::Named(name.imported.name().as_str())
                    }
                };
                let magic_function = MagicFunction::from_import(import_source, name);

                let Some(magic_function) = magic_function else {
                    continue;
                };

                let symbol_id = specifier.local().symbol_id();

                self.state
                    .magic_function_table
                    .insert(symbol_id, magic_function);
            }
        }
    }

    fn exit_call_expression(&mut self, node: &mut CallExpression<'a>, ctx: &mut TraverseCtx<'a>) {
        let callee = &node.callee;

        if let Expression::Identifier(ident) = callee {
            let ref_id = ident.reference_id();
            let Some(symbol) = ctx.scoping.scoping().get_reference(ref_id).symbol_id() else {
                return;
            };
            let Some(magic_function) = self.state.magic_function_table.get(&symbol) else {
                return;
            };
            match magic_function {
                MagicFunction::Route => {
                    self.handle_route_function(node, ctx);
                }
            }
        }
    }
}

#[napi(object)]
pub struct CompileResult {
    pub source: String,
    pub discoveries: Vec<Discovery>,
}

fn compile(source: &str, language: SourceType) -> CompileResult {
    let allocator = Allocator::new();
    let parser = Parser::new(&allocator, source, language);
    let mut program = parser.parse().program;
    let scoping = SemanticBuilder::new()
        .build(&program)
        .semantic
        .into_scoping();
    let mut state = CompilerState::new(Target::Client, source);

    traverse_mut(
        &mut DiscoveryTraverser {
            state: &mut state,
            declarations_to_add: vec![],
        },
        &allocator,
        &mut program,
        scoping,
    );

    let codegen = Codegen::new().build(&program);

    let code = codegen.code;

    CompileResult {
        source: code,
        discoveries: state.discoveries,
    }
}

#[napi]
#[allow(dead_code)]
fn compile_script(source: String, file_name: String) -> CompileResult {
    let language = SourceType::from_path(file_name).unwrap_or(SourceType::tsx());
    compile(&source, language)
}
