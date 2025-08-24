import Yoga, { Direction, Display, Edge, FlexDirection, Gutter, Justify, MeasureMode, PositionType, type Node } from "yoga-layout";
import type { BoxStyle, Canvas } from "../render";
import { resolveUDLRDescription, type Frame } from "@vortexjs/intrinsics";
import type { IntrinsicComponent } from "@vortexjs/core";

export interface TreeNode {
    yoga: Node;
    render(canvas: Canvas): void;
}

function getYogaConfig() {
    const config = Yoga.Config.create();

    config.setPointScaleFactor(1);
    config.setUseWebDefaults(false);

    return config;
}

const config = getYogaConfig();

export type FrameProps = Omit<typeof Frame extends IntrinsicComponent<infer Props, any>
    ? Props
    : never, "children">;

function pixelToTileX<T extends string | never>(px: number | T): number | T {
    if (Number.isNaN(Number(px))) {
        return px;
    }

    return Math.round(Number(px) / (10 / 4));
}

function pixelToTileY<T extends string | never>(px: number | T): number | T {
    if (Number.isNaN(Number(px))) {
        return px;
    }

    return Math.round(Number(px) / (25 / 4));
}

export class Box implements TreeNode {
    yoga: Node;
    attributes: FrameProps = {};
    private _children: TreeNode[] = [];

    get children(): TreeNode[] {
        return this._children;
    }

    set children(children: TreeNode[]) {
        this._children = children;

        while (this.yoga.getChildCount() > 0) {
            this.yoga.removeChild(this.yoga.getChild(0));
        }

        for (const child of children) {
            this.yoga.insertChild(child.yoga, this.yoga.getChildCount());
        }
    }

    constructor() {
        this.yoga = Yoga.Node.create(config);
    }

    render(canvas: Canvas): void {
        const layout = this.yoga.getComputedLayout();

        const left = layout.left;
        const top = layout.top;
        const right = left + layout.width;
        const bottom = top + layout.height;

        if (this.attributes.background) {
            const backgroundColor = typeof this.attributes.background === "string"
                ? this.attributes.background
                : this.attributes.background.color ?? "black";

            if (this.attributes.background === "transparent") {
                canvas.box("none", left, top, right, bottom, backgroundColor);
            } else {
                canvas.box("background-square", left, top, right - 1, bottom - 1, backgroundColor);
            }
        }

        if (this.attributes.border) {
            const borderWidth = typeof this.attributes.border == "string" ? 1 : this.attributes.border.width ?? 1;
            const borderColor = typeof this.attributes.border === "string"
                ? this.attributes.border
                : this.attributes.border.color ?? "white";
            const radius = typeof this.attributes.border === "string"
                ? 0
                : this.attributes.border.radius ?? 0;

            if (borderWidth > 0) {
                canvas.box(radius > 0 ? "outline-round" : "outline-square", left, top, right - 1, bottom - 1, borderColor);
            }
        }

        const border = this.attributes.border ? 1 : 0;

        using _clip = this.attributes.clip ? canvas.clip(left + border, top + border, right - border, bottom - border) : undefined;
        using _off = canvas.offset(left, top);

        for (const child of this.children) {
            child.render(canvas);
        }
    }

    update() {
        this.yoga.setFlexGrow(this.attributes.grow);

        this.yoga.setGap(Gutter.Row, pixelToTileX(this.attributes.gap ?? 0) as number);
        this.yoga.setGap(Gutter.Column, pixelToTileY(this.attributes.gap ?? 0) as number);

        switch (this.attributes.position ?? "relative") {
            case "absolute":
                this.yoga.setPositionType(PositionType.Absolute);
                break;
            case "relative":
                this.yoga.setPositionType(PositionType.Relative);
                break;
            case "static":
                this.yoga.setPositionType(PositionType.Static);
                break;
        }

        if (this.attributes.left !== undefined) {
            this.yoga.setPosition(Edge.Left, pixelToTileX(this.attributes.left) as number);
        }
        if (this.attributes.top !== undefined) {
            this.yoga.setPosition(Edge.Top, pixelToTileY(this.attributes.top) as
                number);
        }
        if (this.attributes.right !== undefined) {
            this.yoga.setPosition(Edge.Right, pixelToTileX(this.attributes.right) as number);
        }
        if (this.attributes.bottom !== undefined) {
            this.yoga.setPosition(Edge.Bottom, pixelToTileY(this.attributes.bottom) as
                number);
        }

        const padding = resolveUDLRDescription(this.attributes.padding ?? 0);

        this.yoga.setPadding(Edge.Top, pixelToTileY(padding.top) as number);
        this.yoga.setPadding(Edge.Right, pixelToTileX(padding.right) as number);
        this.yoga.setPadding(Edge.Bottom, pixelToTileY(padding.bottom) as number);
        this.yoga.setPadding(Edge.Left, pixelToTileX(padding.left) as number);

        const margin = resolveUDLRDescription(this.attributes.margin ?? 0);

        this.yoga.setMargin(Edge.Top, pixelToTileY(margin.top) as number);
        this.yoga.setMargin(Edge.Right, pixelToTileX(margin.right) as number);
        this.yoga.setMargin(Edge.Bottom, pixelToTileY(margin.bottom) as number);
        this.yoga.setMargin(Edge.Left, pixelToTileX(margin.left) as number);

        switch (this.attributes.justifyContent) {
            case "flex-start":
                this.yoga.setJustifyContent(Justify.FlexStart);
                break;
            case "flex-end":
                this.yoga.setJustifyContent(Justify.FlexEnd);
                break;
            case "center":
                this.yoga.setJustifyContent(Justify.Center);
                break;
            case "space-between":
                this.yoga.setJustifyContent(Justify.SpaceBetween);
                break;
            case "space-around":
                this.yoga.setJustifyContent(Justify.SpaceAround);
                break;
            case "space-evenly":
                this.yoga.setJustifyContent(Justify.SpaceEvenly);
                break;
        }

        switch (this.attributes.direction) {
            case "row":
                this.yoga.setFlexDirection(FlexDirection.Row);
                break;
            case "column":
                this.yoga.setFlexDirection(FlexDirection.Column);
                break;
            case "row-reverse":
                this.yoga.setFlexDirection(FlexDirection.RowReverse);
                break;
            case "column-reverse":
                this.yoga.setFlexDirection(FlexDirection.ColumnReverse);
                break;
        }

        if (this.attributes.border) {
            this.yoga.setBorder(Edge.All, 1)
        }
        this.yoga.setWidth(
            typeof this.attributes.width === "number"
                ? pixelToTileX(this.attributes.width)
                : (this.attributes.width as any)
        );
        this.yoga.setHeight(
            typeof this.attributes.height === "number"
                ? pixelToTileY(this.attributes.height)
                : (this.attributes.height as any)
        );
        this.yoga.setMinWidth(
            typeof this.attributes.minWidth === "number"
                ? pixelToTileX(this.attributes.minWidth)
                : (this.attributes.minWidth as any)
        );
        this.yoga.setMinHeight(
            typeof this.attributes.minHeight === "number"
                ? pixelToTileY(this.attributes.minHeight)
                : (this.attributes.minHeight as any)
        );
        this.yoga.setMaxWidth(
            typeof this.attributes.maxWidth === "number"
                ? pixelToTileX(this.attributes.maxWidth)
                : (this.attributes.maxWidth as any)
        );
        this.yoga.setMaxHeight(
            typeof this.attributes.maxHeight === "number"
                ? pixelToTileY(this.attributes.maxHeight)
                : (this.attributes.maxHeight as any)
        );
        this.yoga.setAlwaysFormsContainingBlock(true);
    }
}

function getTextSegments(text: string): string[] {
    return text.split(/(\s)/).filter(segment => segment.length > 0);
}

export function layoutText(text: TextSlice[], maxWidth: number): TextSlice[][] {
    let lines: TextSlice[][] = [];

    let currentLine: TextSlice[] = [];
    let width = 0;

    for (const segment of text) {
        if (segment.text === "\r") continue;
        if (segment.text === "\t") {
            segment.text = "    ";
        }

        if (width + segment.text.length > maxWidth || segment.text === "\n") {
            lines.push(currentLine);
            currentLine = [];
            width = 0;
        }

        if (segment.text === "\n") {
            continue;
        }

        currentLine.push(segment);
        width += segment.text.length;
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines;
}

type TextChild = Text | string;

type TextSlice = {
    text: string;
} & TextStyle;

type TextStyle = {
    color: string;
    underline: boolean;
    italic: boolean;
    bold: boolean;
    background: string;
}

export class Text implements TreeNode {
    yoga: Node;
    children: TextChild[];
    style: Partial<TextStyle> = {};
    realize(style: TextStyle = {
        color: "white",
        underline: false,
        italic: false,
        bold: false,
        background: "transparent"
    }): TextSlice[] {
        const color = this.style.color ?? style.color;
        const italic = this.style.italic ?? style.italic;
        const bold = this.style.bold ?? style.bold;
        const underline = this.style.underline ?? style.underline;
        const background = this.style.background ?? style.background;

        let slices: TextSlice[] = [];

        for (const child of this.children) {
            if (typeof child === "string") {
                const segments = getTextSegments(child);
                for (const segment of segments) {
                    slices.push({
                        text: segment,
                        color,
                        italic,
                        bold,
                        underline,
                        background
                    })
                }
                continue;
            }

            const realized = child.realize({
                color,
                italic,
                bold,
                underline,
                background
            });

            slices.push(...realized);
        }

        return slices;
    }

    constructor(text: TextChild[]) {
        this.children = text;
        this.yoga = Yoga.Node.create(config);
        this.yoga.setMeasureFunc((width, widthMode, height, heightMode) => {
            const maxW = widthMode === MeasureMode.Undefined ? Number.MAX_VALUE : width;
            const realized = this.realize();
            const lines = layoutText(realized, maxW);

            let measuredWidth = Math.min(...lines.map(x => x.length));
            if (widthMode === MeasureMode.AtMost) {
                measuredWidth = Math.min(...realized.map(x => x.text.length));
            } else if (widthMode === MeasureMode.Exactly) {
                measuredWidth = width;
            }

            let measuredHeight = lines.length;
            if (heightMode === MeasureMode.AtMost) {
                measuredHeight = Math.min(measuredHeight, height);
            } else if (heightMode === MeasureMode.Exactly) {
                measuredHeight = height;
            }

            return { width: measuredWidth, height: measuredHeight };
        });
    }

    render(canvas: Canvas): void {
        const { left, top, width } = this.yoga.getComputedLayout();

        const lines = layoutText(this.realize(), width);

        let y = top;

        for (const line of lines) {
            let x = left;

            for (const segment of line) {
                for (const character of segment.text) {
                    canvas.put(x, y, {
                        background: segment.background,
                        foreground: segment.color,
                        text: character,
                        bold: segment.bold,
                        underline: segment.underline,
                        italic: segment.italic
                    })
                    x++;
                }
            }

            y++;
        }
    }
}
