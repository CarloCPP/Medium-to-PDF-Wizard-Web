import { Component, ElementRef, input, signal, ViewChild, ChangeDetectionStrategy, output, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { GeminiService } from '../services/gemini.service';
import { TranslationService } from '../services/translation.service';

declare var html2pdf: any;

@Component({
  selector: 'app-article-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'handleKeyboardShortcuts($event)'
  },
  template: `
    <div class="h-full flex flex-col bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
      <!-- Toolbar -->
      <div class="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <span class="font-bold text-slate-700 truncate max-w-[200px]" [title]="title()">
            {{ title() || t()('untitledArticle') }}
          </span>
          <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {{ isEditMode() ? t()('editModeOn') : t()('previewMode') }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          @if (!isGeneratingPdf()) {
            <button 
              (click)="toggleEditMode()"
              [class]="isEditMode() ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'"
              class="px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-2"
              [title]="t()('editContentButton')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              {{ isEditMode() ? t()('finishEditingButton') : t()('editContentButton') }}
            </button>
            
            @if(isEditMode()) {
              <button (click)="undo()" [disabled]="!canUndo()" class="p-1.5 text-slate-600 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" [title]="t()('undoButton')">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 9"></path></svg>
              </button>
              <button (click)="redo()" [disabled]="!canRedo()" class="p-1.5 text-slate-600 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" [title]="t()('redoButton')">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3v6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-3.7"></path></svg>
              </button>
            }

             <!-- Translate Button -->
            <div class="relative inline-block text-left">
                <button (click)="showTranslate.set(!showTranslate())"
                        [disabled]="isAnalyzing() || isTranslating() || !hasApiKey()"
                        [title]="!hasApiKey() ? t()('summaryFailedTitle') : t()('translateArticle')"
                        class="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    @if(isTranslating()) {
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>{{ t()('translating') }}</span>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path></svg>
                      <span>{{ t()('translateArticle') }}</span>
                    }
                </button>
                @if(showTranslate()) {
                    <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <div class="py-1" role="menu" aria-orientation="vertical">
                            <a (click)="translateArticle('English')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{{ t()('english') }}</a>
                            <a (click)="translateArticle('Simplified Chinese')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{{ t()('simplifiedChinese') }}</a>
                            <a (click)="translateArticle('Traditional Chinese')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{{ t()('traditionalChinese') }}</a>
                            <a (click)="translateArticle('Japanese')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{{ t()('japanese') }}</a>
                        </div>
                    </div>
                }
            </div>

            <button 
              (click)="generateSummary()"
              [disabled]="isAnalyzing() || isTranslating() || !hasApiKey()"
              [title]="!hasApiKey() ? t()('summaryFailedTitle') : 'Generate AI Summary'"
              class="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isAnalyzing()) {
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <span>{{ t()('analyzingButton') }}</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
                 <span>{{ t()('generateSummaryButton') }}</span>
              }
            </button>

            <button 
              (click)="downloadPdf()"
              class="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              {{ t()('downloadPdfButton') }}
            </button>
            
            <button
               (click)="close.emit()"
               class="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50"
               [title]="t()('closeButton')">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          }
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-auto bg-slate-50 relative p-4 md:p-8" id="preview-scroll-container">
        <!-- Paper Sheet -->
        <div 
          #contentContainer
          class="bg-white shadow-sm max-w-[800px] mx-auto min-h-[1000px] p-8 md:p-12 article-content text-lg text-slate-800 font-serif"
          (click)="handleContentClick($event)"
          (mouseover)="handleContentHover($event)"
          (mouseout)="handleContentOut($event)">
          
          <!-- AI Summary Section (Injected via logic) -->
          @if (summaryHtml()) {
            <div class="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-xl font-sans text-base">
               <div class="flex items-center gap-2 mb-3 text-indigo-700 font-bold uppercase text-xs tracking-wider">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
                 {{ t()('aiSummaryHeader') }}
               </div>
               <div [innerHTML]="summaryHtml()"></div>
            </div>
          }

          <!-- Main Article HTML -->
          <div [innerHTML]="sanitizedContent()"></div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ArticlePreviewComponent {
  // Inputs
  htmlContent = input.required<string>();
  title = input<string>('');
  apiKey = input<string | null>(null);
  
  // Outputs
  close = output<void>();

  // Injections
  private sanitizer = inject(DomSanitizer);
  private geminiService = inject(GeminiService);
  private translationService = inject(TranslationService);
  t = this.translationService.t;

  // State
  isEditMode = signal(false);
  isAnalyzing = signal(false);
  isTranslating = signal(false);
  isGeneratingPdf = signal(false);
  summaryHtml = signal<SafeHtml | null>(null);
  hasApiKey = computed(() => !!this.apiKey());
  showTranslate = signal(false);

  // Edit History State
  private history = signal<string[]>([]);
  private historyIndex = signal(-1);
  canUndo = computed(() => this.historyIndex() > 0);
  canRedo = computed(() => this.historyIndex() < this.history().length - 1);

  // Refs
  @ViewChild('contentContainer') contentContainer!: ElementRef<HTMLDivElement>;

  // Computed
  sanitizedContent = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.htmlContent()));

  constructor() {
    effect(() => {
      // This effect runs whenever the htmlContent input changes.
      this.htmlContent(); 
      // Reset edit history when new content is loaded to prevent conflicts.
      this.history.set([]);
      this.historyIndex.set(-1);
    });
  }

  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (!this.isEditMode()) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    if (ctrlKey && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if (ctrlKey && event.key === 'y') {
      event.preventDefault();
      this.redo();
    }
  }

  toggleEditMode() {
    this.isEditMode.update(v => !v);
    if (this.isEditMode() && this.history().length === 0) {
      // First time entering edit mode for this content, capture initial state.
      this.captureInitialState();
    }
  }

  private captureInitialState() {
     if (this.contentContainer) {
      this.history.set([this.contentContainer.nativeElement.innerHTML]);
      this.historyIndex.set(0);
    }
  }

  private captureStateAfterEdit() {
    if (!this.contentContainer) return;
    const currentHtml = this.contentContainer.nativeElement.innerHTML;
    // Truncate "future" history if we've undone things before making a new edit.
    const newHistory = this.history().slice(0, this.historyIndex() + 1);
    newHistory.push(currentHtml);
    this.history.set(newHistory);
    this.historyIndex.update(i => i + 1);
  }

  undo() {
    if (!this.canUndo()) return;
    this.historyIndex.update(i => i - 1);
    this.contentContainer.nativeElement.innerHTML = this.history()[this.historyIndex()];
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex.update(i => i + 1);
    this.contentContainer.nativeElement.innerHTML = this.history()[this.historyIndex()];
  }

  handleContentClick(event: MouseEvent) {
    if (!this.isEditMode()) return;
    
    const target = event.target as HTMLElement;
    if (target === this.contentContainer.nativeElement || target.closest('.bg-indigo-50')) return;

    event.preventDefault();
    event.stopPropagation();
    
    target.remove();
    this.captureStateAfterEdit();
  }

  handleContentHover(event: MouseEvent) {
    if (!this.isEditMode()) return;
    const target = event.target as HTMLElement;
    if (target === this.contentContainer.nativeElement || target.closest('.bg-indigo-50')) return;

    target.classList.add('hover-delete-target');
  }

  handleContentOut(event: MouseEvent) {
    if (!this.isEditMode()) return;
    const target = event.target as HTMLElement;
    target.classList.remove('hover-delete-target');
  }

  async generateSummary() {
    const key = this.apiKey();
    if (!key) {
      alert(this.t()('apiKeyNotSetAlert'));
      return;
    }

    this.isAnalyzing.set(true);
    const rawText = this.contentContainer.nativeElement.innerText;
    
    try {
      const summary = await this.geminiService.summarizeContent(rawText, key);
      this.summaryHtml.set(this.sanitizer.bypassSecurityTrustHtml(summary));
    } catch (e: any) {
      alert(this.t()('summaryFailedAlert'));
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async translateArticle(language: string) {
    this.showTranslate.set(false);
    const key = this.apiKey();
    if (!key) {
      alert(this.t()('apiKeyNotSetAlert'));
      return;
    }
    
    // Ensure we are in edit mode to use the history
    if (!this.isEditMode()) {
        this.toggleEditMode();
    }

    this.isTranslating.set(true);
    const originalHtml = this.contentContainer.nativeElement.innerHTML;

    try {
        const translatedHtml = await this.geminiService.translateContent(originalHtml, language, key);
        this.contentContainer.nativeElement.innerHTML = translatedHtml;
        this.captureStateAfterEdit();
    } catch (e) {
        alert('Translation failed.');
    } finally {
        this.isTranslating.set(false);
    }
}


  downloadPdf() {
    if (typeof html2pdf === 'undefined') {
      alert(this.t()('pdfLibraryNotLoadedAlert'));
      return;
    }

    this.isGeneratingPdf.set(true);
    const wasEditMode = this.isEditMode();
    this.isEditMode.set(false);

    const element = this.contentContainer.nativeElement;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${this.title() || 'article'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      this.isGeneratingPdf.set(false);
      this.isEditMode.set(wasEditMode);
    }).catch((err: any) => {
      console.error(err);
      this.isGeneratingPdf.set(false);
      this.isEditMode.set(wasEditMode);
      alert(this.t()('pdfFailedAlert'));
    });
  }
}
