"use client";

import { useRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  InsertThematicBreak,
  UndoRedo,
  Separator,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

type Props = {
  value: string;
  onChange?: (value: string) => void;
  name?: string;
  readOnly?: boolean;
};

export function MarkdownEditor({ value, onChange, name, readOnly = false }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white">
      <MDXEditor
        ref={editorRef}
        markdown={value}
        readOnly={readOnly}
        onChange={onChange}
        contentEditableClassName="prose max-w-none px-4 py-3 min-h-[300px] text-slate-700 focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          ...(readOnly
            ? []
            : [
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                      <Separator />
                      <BlockTypeSelect />
                      <Separator />
                      <ListsToggle />
                      <Separator />
                      <CreateLink />
                      <InsertThematicBreak />
                    </>
                  ),
                }),
              ]),
        ]}
      />
      {name ? (
        <input type="hidden" name={name} value={value} />
      ) : null}
    </div>
  );
}
