import { BaseEditor, BaseText } from "slate";
import { HistoryEditor } from "slate-history";
import { ReactEditor } from "slate-react";

export type CustomText = BaseText & {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  highlight?: {
    tag: string;
    color: string;
  };
};

export type ParagraphElement = {
  type: "paragraph";
  children: CustomText[];
};

export type HeadingElement = {
  type:
    | "heading-one"
    | "heading-two"
    | "heading-three"
    | "heading-four"
    | "heading-five"
    | "heading-six";
  children: CustomText[];
};

export type BlockQuoteElement = {
  type: "block-quote";
  children: CustomText[];
};

export type ListItemElement = {
  type: "list-item";
  children: CustomText[];
};

export type LinkElement = {
  type: "link";
  url: string;
  children: CustomText[];
};

export type CustomElement =
  | ParagraphElement
  | HeadingElement
  | BlockQuoteElement
  | ListItemElement
  | LinkElement;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
