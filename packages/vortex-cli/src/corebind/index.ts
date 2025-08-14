import { createContext, getImmediateValue, implementIntrinsic, store, type IntrinsicComponent, type Lifetime, type Renderer, type Store } from "@vortexjs/core";
import { Box, type TreeNode, Text } from "../tree";
import { fontWeightToPrimitiveBoldness, Frame, Text as TextIntrinsic, type FontWeight } from "@vortexjs/intrinsics";
import { jsx } from "@vortexjs/core/jsx-runtime";

export function cli(): Renderer<TreeNode, undefined> {
    return {
        createNode(type: string, hydration?: undefined): TreeNode {
            if (type === "box") {
                return new Box();
            }
            if (type === "text") {
                return new Text([]);
            }
            throw new Error(`Unknown node type: ${type}`);
        },
        setAttribute(node: TreeNode, name: string, value: any): void {
            if (node instanceof Box) {
                (node.attributes as any)[name] = value;
                node.update();
            } else if (node instanceof Text) {
                if (name === "weight") {
                    const weight = value as FontWeight;
                    const isBold = fontWeightToPrimitiveBoldness(weight);
                    node.style.bold = isBold === "bold";
                    return;
                }
                (node.style as any)[name] = value;
            } else {
                throw new Error("setAttribute can only be called on Box and Text nodes.");
            }
        },
        createTextNode(hydration?: undefined): TreeNode {
            return new Text([]);
        },
        setTextContent(node: TreeNode, text: string): void {
            if (node instanceof Text) {
                node.children = [text];
            } else {
                throw new Error("setTextContent can only be called on Text nodes.");
            }
        },
        setChildren(node: TreeNode, children: TreeNode[]): void {
            if ('children' in node) {
                node.children = children;
            }
        },
        getHydrationContext(node: TreeNode): undefined {
            return undefined;
        },
        addEventListener(node: TreeNode, name: string, event: (event: any) => void): Lifetime {
            throw new Error("Function not implemented.");
        },
        bindValue<T>(node: TreeNode, name: string, value: Store<T>): Lifetime {
            if (node instanceof Box) {
                return value.subscribe((newValue) => {
                    this.setAttribute(node, name, newValue);
                });
            }
            throw new Error("bindValue can only be called on Box nodes.");
        },
        setStyle(node: TreeNode, name: string, value: string | undefined): void {
            throw new Error("Function not implemented.");
        },
        implementations: [
            implementIntrinsic(Frame, (props) => {
                return jsx("box", props);
            }),
            implementIntrinsic(TextIntrinsic, (props) => {
                return jsx("text", props);
            })
        ]
    }
}
