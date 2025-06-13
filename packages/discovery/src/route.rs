use std::collections::HashMap;

use oxc::{
    allocator::CloneIn,
    ast::ast::{
        CallExpression, Declaration, Expression, Statement, TSTypeAnnotation,
        VariableDeclarationKind,
    },
    span::GetSpan,
};
use oxc_traverse::TraverseCtx;

use crate::{
    state::{CompilerError, Discovery, RouteFrame},
    DiscoveryTraverser,
};

impl<'a> DiscoveryTraverser<'a, '_> {
    pub fn create_export<'p>(
        &mut self,
        ctx: &mut TraverseCtx<'a>,
        to_export: &Expression<'p>,
    ) -> String {
        let span = to_export.span();
        let id = format!("discovery${}${}", span.start, span.end);

        let declarator = ctx.ast.variable_declarator(
            span,
            VariableDeclarationKind::Const,
            ctx.ast
                .binding_pattern::<Option<oxc::allocator::Box<TSTypeAnnotation>>>(
                    ctx.ast
                        .binding_pattern_kind_binding_identifier(span, ctx.ast.atom(&id)),
                    None,
                    false,
                ),
            Some(to_export.clone_in(ctx.ast.allocator)),
            false,
        );

        let var_decl = Declaration::VariableDeclaration(ctx.ast.alloc_variable_declaration(
            span,
            VariableDeclarationKind::Const,
            ctx.ast.vec_from_array([declarator]),
            false,
        ));

        self.declarations_to_add
            .push(Statement::ExportNamedDeclaration(
                ctx.ast
                    .plain_export_named_declaration_declaration(span, var_decl),
            ));

        id
    }

    pub fn handle_route_function(
        &mut self,
        node: &mut CallExpression<'a>,
        ctx: &mut TraverseCtx<'a>,
    ) {
        if node.arguments.len() != 2 {
            self.state
                .add_error(CompilerError::IncorrectNumberOfArguments {
                    span: node.span,
                    expected: 2,
                    found: node.arguments.len(),
                });
            return;
        }

        let route = self
            .state
            .get_literal_string(node.arguments.remove(0).to_expression());

        let opts_expr = node.arguments.remove(0);
        let mut opts: HashMap<String, &Expression> = HashMap::new();

        self.state
            .get_object_keys(opts_expr.to_expression(), &mut opts);

        for export in ["page", "layout"] {
            if opts.contains_key(export) {
                let export_id = self.create_export(ctx, opts.get(export).unwrap());

                node.arguments.clear();

                node.callee = self.create_empty_iife(ctx);

                let frame = match export {
                    "page" => RouteFrame::Page,
                    "layout" => RouteFrame::Layout,
                    _ => unreachable!(),
                };

                self.state.discoveries.push(Discovery::Route {
                    frame,
                    path: route.clone(),
                    export: export_id.clone(),
                });
            }
        }
    }
}
