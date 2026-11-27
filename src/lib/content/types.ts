/**
 * Article body types.
 *
 * The spec's polymorphic schemas lack a discriminator mapping, so openapi-typescript names the tags
 * after the schema ("Heading", "TextRun"…) while the backend sends Jackson subtype names ("heading",
 * "text"…) — see BG-19. We keep every FIELD from the generated schema and correct only the `type`
 * tag here. When the spec gains `discriminator.mapping`, these aliases collapse to the generated types.
 */
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
type Retag<T, Tag extends string> = Omit<T, "type"> & { type: Tag };

export type TextRun = Retag<S["TextRun"], "text">;
export type StyledRun = Omit<Retag<S["StyledRun"], "styled">, "children"> & { children?: Inline[] };
export type InlineCode = Retag<S["InlineCode"], "code">;
export type ExternalLink = Retag<S["ExternalLink"], "externalLink">;
export type InternalLink = Retag<S["InternalLink"], "internalLink">;
export type ImageReference = Retag<S["ImageReference"], "image">;
export type LineBreak = Retag<S["LineBreak"], "break">;

export type Inline = TextRun | StyledRun | InlineCode | ExternalLink | InternalLink | ImageReference | LineBreak;

export type Heading = Omit<Retag<S["Heading"], "heading">, "content"> & { content?: Inline[] };
export type Paragraph = Omit<Retag<S["Paragraph"], "paragraph">, "content"> & { content?: Inline[] };
export type CodeBlock = Retag<S["CodeBlock"], "code">;
export type Quote = Omit<Retag<S["Quote"], "quote">, "content"> & { content?: Block[] };
/** `ListItem.content` is `unknown[]` in the spec; at runtime it holds blocks (usually paragraphs). */
export type ListItem = { content?: Block[] };
export type ListBlock = Omit<Retag<S["ListBlock"], "list">, "items"> & { items?: ListItem[] };
export type TableCell = Omit<S["TableCell"], "content"> & { content?: Inline[] };
export type TableRow = { cells?: TableCell[] };
export type TableBlock = Omit<Retag<S["TableBlock"], "table">, "header" | "rows"> & {
  header?: TableRow[];
  rows?: TableRow[];
};
export type ThematicBreak = Retag<S["ThematicBreak"], "thematicBreak">;

export type Block = Heading | Paragraph | CodeBlock | Quote | ListBlock | TableBlock | ThematicBreak;

/** Read model with the body retyped; every other field is the generated type. */
export type ArticleReadModel = Omit<S["ArticleReadModel"], "body"> & { body?: Block[] };

/** Plain text of inline content (for headings, previews, aria labels). */
export function inlineText(content: Inline[] | undefined): string {
  if (!content) return "";
  return content
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text ?? "";
        case "styled":
          return inlineText(node.children);
        case "code":
          return node.code ?? "";
        case "externalLink":
          return node.title ?? node.url ?? "";
        case "internalLink":
          return node.displayText ?? node.targetReference ?? "";
        case "image":
          return node.altText ?? "";
        case "break":
          return " ";
        default:
          return "";
      }
    })
    .join("");
}
