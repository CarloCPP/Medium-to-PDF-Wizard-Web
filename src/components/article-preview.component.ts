import { Component, ElementRef, input, signal, ViewChild, ChangeDetectionStrategy, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { GeminiService } from '../services/gemini.service';

declare var html2pdf: any;

@Component({
  selector: 'app-article-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
      <!-- Toolbar -->
      <div class="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <span class="font-bold text-slate-700 truncate max-w-[200px]" [title]="title()">
            {{ title() || 'Untitled Article' }}
          </span>
          <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {{ isEditMode() ? 'Edit Mode: ON' : 'Preview Mode' }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          @if (!isGeneratingPdf()) {
            <button 
              (click)="toggleEditMode()"
              [class]="isEditMode() ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'"
              class="px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-2"
              title="Click elements in the preview to remove them">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              {{ isEditMode() ? 'Finish Editing' : 'Edit Content' }}
            </button>

            <button 
              (click)="generateSummary()"
              [disabled]="isAnalyzing() || !hasApiKey()"
              [title]="!hasApiKey() ? 'Set your Gemini API Key in Settings to use this feature' : 'Generate AI Summary'"
              class="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isAnalyzing()) {
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
              }
              Gemini Summary
            </button>

            <button 
              (click)="downloadPdf()"
              class="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download PDF
            </button>
            
            <button
               (click)="close.emit()"
               class="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50"
               title="Close">
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
                 AI Summary
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

  // State
  isEditMode = signal(false);
  isAnalyzing = signal(false);
  isGeneratingPdf = signal(false);
  summaryHtml = signal<SafeHtml | null>(null);
  hasApiKey = computed(() => !!this.apiKey());

  // Refs
  @ViewChild('contentContainer') contentContainer!: ElementRef<HTMLDivElement>;

  // Computed
  sanitizedContent = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.htmlContent()));

  toggleEditMode() {
    this.isEditMode.update(v => !v);
  }

  handleContentClick(event: MouseEvent) {
    if (!this.isEditMode()) return;
    
    const target = event.target as HTMLElement;
    // Don't delete the main container or the AI summary wrapper
    if (target === this.contentContainer.nativeElement || target.closest('.bg-indigo-50')) return;

    event.preventDefault();
    event.stopPropagation();
    
    // Remove the element
    target.remove();
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
      alert('API Key not set. Please set your Gemini API key in the app settings.');
      return;
    }

    this.isAnalyzing.set(true);
    const rawText = this.contentContainer.nativeElement.innerText;
    
    try {
      const summary = await this.geminiService.summarizeContent(rawText, key);
      this.summaryHtml.set(this.sanitizer.bypassSecurityTrustHtml(summary));
    } catch (e: any) {
      alert(e.message || 'Failed to generate summary. Please check your API key and network connection.');
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  downloadPdf() {
    if (typeof html2pdf === 'undefined') {
      alert('PDF library not loaded. Please check your internet connection.');
      return;
    }

    this.isGeneratingPdf.set(true);
    // Disable edit mode during generation to remove dashed lines if any
    const wasEditMode = this.isEditMode();
    this.isEditMode.set(false);

    const element = this.contentContainer.nativeElement;
    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right
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
      alert('PDF generation failed.');
    });
  }
}
