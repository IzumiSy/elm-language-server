/* eslint-disable @typescript-eslint/no-use-before-define */
import { CodeAction, Range } from "vscode-languageserver";
import { TextEdit } from "vscode-languageserver-textdocument";
import { RefactorEditUtils } from "../../util/refactorEditUtils";
import { TreeUtils } from "../../util/treeUtils";
import { Diagnostics } from "../../util/types/diagnostics";
import { CodeActionProvider, ICodeActionParams } from "../codeActionProvider";

const errorCodes = [Diagnostics.MissingValue.code];
const fixId = "make_declaration_from_usage";

CodeActionProvider.registerCodeAction({
  errorCodes,
  fixId,
  getCodeActions: (params: ICodeActionParams) => {
    const edits = getEdits(params, params.range);

    if (edits.length > 0) {
      return [
        CodeActionProvider.getCodeAction(
          params,
          "Create local function",
          edits,
        ),
      ];
    }

    return [];
  },
  getFixAllCodeAction: (params: ICodeActionParams): CodeAction | undefined => {
    return CodeActionProvider.getFixAllCodeAction(
      "Create all missing local functions",
      params,
      errorCodes,
      fixId,
      (edits, diagnostic) => {
        edits.push(...getEdits(params, diagnostic.range));
      },
    );
  },
});

function getEdits(params: ICodeActionParams, range: Range): TextEdit[] {
  const nodeAtPosition = TreeUtils.getNamedDescendantForRange(
    params.sourceFile,
    range,
  );

  if (
    nodeAtPosition.type === "lower_case_identifier" &&
    nodeAtPosition.parent?.parent?.type === "value_expr" &&
    nodeAtPosition.parent?.parent?.parent &&
    nodeAtPosition.previousSibling?.type !== "dot"
  ) {
    const funcName = nodeAtPosition.text;

    const tree = params.sourceFile.tree;
    const checker = params.program.getTypeChecker();

    const insertLineNumber = RefactorEditUtils.findLineNumberAfterCurrentFunction(
      nodeAtPosition,
    );

    const typeString: string = checker.typeToString(
      checker.findType(nodeAtPosition),
      params.sourceFile,
    );

    const edit = RefactorEditUtils.createTopLevelFunction(
      insertLineNumber ?? tree.rootNode.endPosition.row,
      funcName,
      typeString,
      TreeUtils.findParentOfType("function_call_expr", nodeAtPosition),
    );

    if (edit) {
      return [edit];
    }
  }

  return [];
}