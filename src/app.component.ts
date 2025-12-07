import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentFetcherService } from './services/content-fetcher.service';
import { ArticlePreviewComponent } from './components/article-preview.component';

interface ProcessedArticle {
  id: string;
  originalUrl: string;
  title: string;
  htmlContent: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  errorMsg?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticlePreviewComponent],
  template: `
    <div class="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
      
      <!-- Sidebar / Input Area -->
      <aside class="w-full md:w-[400px] bg-white border-r border-slate-200 flex flex-col shadow-lg z-10 transition-all duration-300"
             [class.hidden]="activeArticle() !== null && isMobile()"
             [class.w-full]="isMobile()">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-white/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <h1 class="text-xl font-bold tracking-tight">Medium PDF Wizard</h1>
          </div>
          <p class="text-slate-300 text-sm">Convert articles to clean PDFs with AI powers.</p>
        </div>

        <!-- Input Form -->
        <div class="p-6 flex-1 overflow-y-auto">
          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Article URLs</label>
            <textarea 
              [(ngModel)]="urlInput"
              class="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none bg-slate-50"
              placeholder="https://medium.com/...&#10;https://medium.com/...&#10;(One URL per line)"
            ></textarea>
            <p class="text-xs text-slate-500 mt-2">
              Supports Medium & Scribe.rip URLs.
            </p>
          </div>

          <button 
            (click)="processUrls()"
            [disabled]="!urlInput.trim() || isProcessing()"
            class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
            @if (isProcessing()) {
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Processing...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
              Fetch Articles
            }
          </button>

          <!-- Article List -->
          @if (articles().length > 0) {
            <div class="mt-8">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Queue</h3>
                <button (click)="clearAll()" class="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
              
              <div class="space-y-3">
                @for (article of articles(); track article.id) {
                  <div 
                    (click)="viewArticle(article)"
                    class="group p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden"
                    [class]="getCardClass(article)">
                    
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-sm truncate" [title]="article.title || article.originalUrl">
                          {{ article.title || 'Loading Article...' }}
                        </h4>
                        <p class="text-xs text-slate-500 mt-1 truncate">{{ article.originalUrl }}</p>
                      </div>
                      
                      <div class="shrink-0 flex items-center">
                        @if (article.status === 'loading') {
                          <div class="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                        }
                        @if (article.status === 'success') {
                          <div class="text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        }
                        @if (article.status === 'error') {
                          <div class="text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          </div>
                        }
                      </div>
                    </div>

                    @if (article.status === 'error') {
                      <div class="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        {{ article.errorMsg }}
                        <button (click)="retryArticle(article, $event)" class="underline ml-1 font-semibold">Retry</button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </aside>

      <!-- Main Preview Area -->
      <main class="flex-1 h-full bg-slate-200 overflow-hidden relative">
        @if (activeArticle(); as article) {
          <div class="absolute inset-0 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            @if (article.status === 'success' && article.htmlContent) {
              <app-article-preview 
                [htmlContent]="article.htmlContent"
                [title]="article.title"
                (close)="closePreview()"
              ></app-article-preview>
            } @else if (article.status === 'loading') {
               <div class="h-full w-full flex flex-col items-center justify-center bg-white rounded-lg shadow-xl text-slate-400">
                 <div class="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                 <p>Fetching content from Scribe.rip...</p>
               </div>
            } @else if (article.status === 'error') {
              <div class="h-full w-full flex flex-col items-center justify-center bg-white rounded-lg shadow-xl text-center p-8">
                 <div class="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </div>
                 <h2 class="text-xl font-bold text-slate-800 mb-2">Oops! Fetch Failed</h2>
                 <p class="text-slate-600 max-w-md mb-6">{{ article.errorMsg }}</p>
                 <button (click)="closePreview()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg">Go Back</button>
              </div>
            }
          </div>
        } @else {
          <!-- Empty State -->
          <div class="h-full w-full flex flex-col items-center justify-center text-slate-400 p-8 hidden md:flex">
            <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </div>
            <h2 class="text-2xl font-bold text-slate-500 mb-2">No Article Selected</h2>
            <p class="max-w-md text-center">Enter Medium URLs on the left to get started. You can clean up the content and generate AI summaries before downloading as PDF.</p>
          </div>
        }
      </main>

    </div>
  `
})
export class AppComponent {
  private contentFetcher = inject(ContentFetcherService);

  urlInput = '';
  isProcessing = signal(false);
  articles = signal<ProcessedArticle[]>([]);
  activeArticle = signal<ProcessedArticle | null>(null);

  isMobile() {
    return window.innerWidth < 768;
  }

  getCardClass(article: ProcessedArticle): string {
    const isActive = this.activeArticle()?.id === article.id;
    if (isActive) return 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500';
    return 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm';
  }

  async processUrls() {
    const urls = this.urlInput
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) return;

    this.isProcessing.set(true);

    // Create entry placeholders
    const newArticles: ProcessedArticle[] = urls.map(url => ({
      id: crypto.randomUUID(),
      originalUrl: url,
      title: 'Pending...',
      htmlContent: null,
      status: 'pending'
    }));

    this.articles.update(prev => [...newArticles, ...prev]);
    this.urlInput = ''; // Clear input

    // Process sequentially (could be parallel, but rate limits might exist)
    for (const article of newArticles) {
      await this.fetchArticleContent(article);
    }

    this.isProcessing.set(false);
  }

  async fetchArticleContent(article: ProcessedArticle) {
    // Update status to loading
    this.updateArticleStatus(article.id, { status: 'loading', title: 'Fetching...' });
    
    // Auto-select if it's the only one or user is waiting
    if (!this.activeArticle()) {
      this.activeArticle.set(this.articles().find(a => a.id === article.id) || null);
    }

    try {
      const content = await this.contentFetcher.fetchArticleHtml(article.originalUrl);
      
      // Extract title from content if possible
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const title = tempDiv.querySelector('h1')?.innerText || 'Untitled Article';

      this.updateArticleStatus(article.id, {
        status: 'success',
        htmlContent: content,
        title: title.substring(0, 100) // limit length
      });
    } catch (e: any) {
      this.updateArticleStatus(article.id, {
        status: 'error',
        errorMsg: e.message || 'Unknown error occurred',
        title: 'Error Fetching'
      });
    }
  }

  updateArticleStatus(id: string, updates: Partial<ProcessedArticle>) {
    this.articles.update(list => 
      list.map(a => a.id === id ? { ...a, ...updates } : a)
    );
    // If this is the active article, force update the signal reference to trigger change detection if needed
    if (this.activeArticle()?.id === id) {
      const updated = this.articles().find(a => a.id === id);
      if (updated) this.activeArticle.set(updated);
    }
  }

  viewArticle(article: ProcessedArticle) {
    this.activeArticle.set(article);
  }

  closePreview() {
    this.activeArticle.set(null);
  }

  retryArticle(article: ProcessedArticle, event: Event) {
    event.stopPropagation();
    this.fetchArticleContent(article);
  }

  clearAll() {
    if (confirm('Are you sure you want to clear the list?')) {
      this.articles.set([]);
      this.activeArticle.set(null);
    }
  }
}