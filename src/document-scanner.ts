/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Document, Import} from 'polymer-analyzer';

import {ConversionSettings} from './conversion-settings';
import {DeleteFileScanResult, DocumentProcessor, HtmlDocumentScanResult, JsModuleScanResult} from './document-processor';
import {rewriteNamespacesAsExports} from './passes/rewrite-namespace-exports';
import {} from './urls/types';
import {UrlHandler} from './urls/url-handler';
import {getHtmlDocumentConvertedFilePath, getJsModuleConvertedFilePath} from './urls/util';

/**
 * Processes a document to determine a ScanResult for it.
 */
export class DocumentScanner extends DocumentProcessor {
  /**
   * Scan a document's new interface as a JS Module.
   */
  scanJsModule(): DeleteFileScanResult|JsModuleScanResult {
    if (this._isWrapperHTMLDocument) {
      return {
        type: 'delete-file',
        originalUrl: this.originalUrl,
        convertedUrl: undefined,
        convertedFilePath: undefined,
      };
    }

    const {exportMigrationRecords} = rewriteNamespacesAsExports(
        this.program, this.document, this.conversionSettings.namespaces);

    return {
      type: 'js-module',
      originalUrl: this.originalUrl,
      convertedUrl: this.convertedUrl,
      convertedFilePath: getJsModuleConvertedFilePath(this.originalUrl),
      exportMigrationRecords,
    };
  }

  /**
   * Scan a document as a top-level HTML document. Top-level HTML documents
   * have no exports to scan, so this returns a simple object containing
   * relevant url mapping information.
   */
  scanTopLevelHtmlDocument(): HtmlDocumentScanResult {
    return {
      type: 'html-document',
      convertedUrl: this.convertedUrl,
      originalUrl: this.originalUrl,
      convertedFilePath: getHtmlDocumentConvertedFilePath(this.originalUrl),
    };
  }

  /**
   * Determines if a document is just a wrapper around a script tag pointing
   * to an external script of the same name as this file.
   */
  private get _isWrapperHTMLDocument() {
    const allFeatures = Array.from(this.document.getFeatures())
                            .filter(
                                (f) =>
                                    !(f.kinds.has('html-document') &&
                                      (f as Document).isInline === false));
    if (allFeatures.length === 1) {
      const f = allFeatures[0];
      if (f.kinds.has('html-script')) {
        const sciprtImport = f as Import;
        const oldScriptUrl =
            this.urlHandler.getDocumentUrl(sciprtImport.document);
        const newScriptUrl = this.convertScriptUrl(oldScriptUrl);
        return newScriptUrl === this.convertedUrl;
      }
    }
    return false;
  }
}