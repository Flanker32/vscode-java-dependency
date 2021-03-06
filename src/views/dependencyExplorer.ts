// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExtensionContext, ProviderResult, TextEditor, TreeView, TreeViewVisibilityChangeEvent, Uri, window } from "vscode";
import { Jdtls } from "../java/jdtls";
import { INodeData } from "../java/nodeData";
import { Settings } from "../settings";
import { Utility } from "../utility";
import { DataNode } from "./dataNode";
import { DependencyDataProvider } from "./dependencyDataProvider";
import { ExplorerNode } from "./explorerNode";

export class DependencyExplorer {

    private _dependencyViewer: TreeView<ExplorerNode>;

    private _dataProvider: DependencyDataProvider;

    private _selectionWhenHidden: DataNode;

    constructor(public readonly context: ExtensionContext) {
        this._dataProvider = new DependencyDataProvider(context);
        this._dependencyViewer = window.createTreeView("javaDependencyExplorer", { treeDataProvider: this._dataProvider });

        window.onDidChangeActiveTextEditor((textEditor: TextEditor) => {
            if (textEditor && textEditor.document && Settings.syncWithFolderExplorer()) {
                this.reveal(textEditor.document.uri);
            }
        });

        this._dependencyViewer.onDidChangeVisibility((e: TreeViewVisibilityChangeEvent) => {
            if (e.visible && this._selectionWhenHidden) {
                this._dependencyViewer.reveal(this._selectionWhenHidden);
                this._selectionWhenHidden = undefined;
            }
        });
    }

    public dispose(): void {
    }

    public reveal(uri: Uri): void {
        Jdtls.resolvePath(uri.toString()).then((paths: INodeData[]) => {
            this.revealPath(this._dataProvider, paths);
        });
    }

    private revealPath(current: { getChildren: (element?: ExplorerNode) => ProviderResult<ExplorerNode[]> }, paths: INodeData[]) {
        if (!current) {
            return;
        }

        const res = current.getChildren();
        if (Utility.isThenable(res)) {
            res.then((children: DataNode[]) => {
                this.visitChildren(children, paths);
            });
        } else {
            this.visitChildren(<DataNode[]>res, paths);
        }
    }

    private visitChildren(children: DataNode[], paths: INodeData[]): void {
        if (children && paths) {
            for (const c of children) {
                if (paths[0] && c.path === paths[0].path && c.nodeData.name === paths[0].name) {
                    if (paths.length === 1) {
                        if (this._dependencyViewer.visible) {
                            this._dependencyViewer.reveal(c);
                        } else {
                            this._selectionWhenHidden = c;
                        }
                    } else {
                        paths.shift();
                        this.revealPath(c, paths);
                    }
                    break;
                }
            }
        }
    }
}
