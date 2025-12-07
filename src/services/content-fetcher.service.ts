import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContentFetcherService {

  convertUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('medium.com')) {
        urlObj.hostname = 'scribe.rip';
        return urlObj.toString();
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  async fetchArticleHtml(url: string): Promise<string> {
    const scribeUrl = this.convertUrl(url);
    // Use a CORS proxy. 'allorigins' is reliable for text content.
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(scribeUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      const fullHtml = data.contents;
      
      // Basic parsing to extract the main content container to avoid fetching header/footer junk
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, 'text/html');
      
      // Try to find the main article content. Scribe.rip usually puts it in specific tags or we look for <main> or <article>
      // Scribe usually has a 'container' class or 'prose'.
      // If we can't find a specific container, we return body.
      
      // Remove scripts and styles for safety and cleanliness
      doc.querySelectorAll('script, style, nav, footer, header, iframe').forEach(el => el.remove());
      
      // Attempt to locate the core content
      const article = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('.container') || doc.body;

      return article.innerHTML;
    } catch (error) {
      console.error('Fetch error:', error);
      throw new Error('Could not fetch content. URL might be protected or invalid.');
    }
  }
}