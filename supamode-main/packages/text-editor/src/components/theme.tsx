export function LexicalTheme() {
  return {
    ltr: 'text-left',
    rtl: 'text-right',
    paragraph:
      'outline-none focus:outline-none relative m-0 mb-4 text-base' +
      ' text-gray-800 dark:text-current font-normal',
    quote: 'editor-quote',
    table: 'my-4 w-full caption-bottom text-sm rounded-md table-fixed',
    tableCell:
      'h-10 px-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] border [&>p]:m-0 text-sm text-muted-foreground',
    tableCellHeader:
      'h-10 px-2 text-left align-middle font-semibold [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] bg-muted text-secondary-foreground border border-background',
    tableCellSelected:
      'bg-primary/5 ring-2 ring-primary/60 ring-offset-1 ring-offset-background',
    tableCellPrimarySelected:
      'bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background',
    tableCellEditing:
      'ring-2 ring-primary/80 ring-offset-1 ring-offset-background',
    heading: {
      h1: 'text-3xl font-bold mb-6',
      h2: 'text-2xl font-semibold mb-4',
      h3: 'text-xl font-medium mb-2',
      h4: 'text-lg font-medium mb-1',
      h5: 'text-lg mb-1',
    },
    list: {
      nested: {
        listitem: 'editor-nested-listitem',
      },
      ol: 'list-decimal pl-8',
      ul: 'list-disc pl-8',
      listitem: 'my-4 mx-8 font-normal text-base',
    },
    image: 'editor-image',
    link: 'underline cursor-pointer',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      overflowed: 'editor-text-overflowed',
      hashtag: 'editor-text-hashtag',
      underline: 'underline',
      strikethrough: 'line-through',
      underlineStrikethrough: 'underline line-through',
      code: 'bg-gray-300 dark:bg-dark-600 font-monospace p-4',
    },
    code: 'editor-code',
    codeHighlight: {
      atrule: 'editor-tokenAttr',
      attr: 'editor-tokenAttr',
      boolean: 'editor-tokenProperty',
      builtin: 'editor-tokenSelector',
      cdata: 'editor-tokenComment',
      char: 'editor-tokenSelector',
      class: 'editor-tokenFunction',
      'class-name': 'editor-tokenFunction',
      comment: 'editor-tokenComment',
      constant: 'editor-tokenProperty',
      deleted: 'editor-tokenProperty',
      doctype: 'editor-tokenComment',
      entity: 'editor-tokenOperator',
      function: 'editor-tokenFunction',
      important: 'editor-tokenVariable',
      inserted: 'editor-tokenSelector',
      keyword: 'editor-tokenAttr',
      namespace: 'editor-tokenVariable',
      number: 'editor-tokenProperty',
      operator: 'editor-tokenOperator',
      prolog: 'editor-tokenComment',
      property: 'editor-tokenProperty',
      punctuation: 'editor-tokenPunctuation',
      regex: 'editor-tokenVariable',
      selector: 'editor-tokenSelector',
      string: 'editor-tokenSelector',
      symbol: 'editor-tokenProperty',
      tag: 'editor-tokenProperty',
      url: 'editor-tokenOperator',
      variable: 'editor-tokenVariable',
    },
  };
}
