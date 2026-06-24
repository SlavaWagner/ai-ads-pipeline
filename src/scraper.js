import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scrapes a landing page URL and extracts clean textual context for the LLM.
 * @param {string} url - The URL of the landing page.
 * @returns {Promise<{title: string, headings: string[], paragraphs: string[], textContent: string}>}
 */
export async function scrapeLandingPage(url) {
  if (!url) {
    return {
      title: '',
      headings: [],
      paragraphs: [],
      textContent: 'No landing page URL provided.'
    };
  }

  try {
    // Add a standard browser User-Agent to avoid simple scraping blocks
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, iframe, noscript, svg, nav, footer, header').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // Extract metadata
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

    // Extract headings
    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && text.length > 3 && !headings.includes(text)) {
        headings.push(text);
      }
    });

    // Extract paragraph texts
    const paragraphs = [];
    $('p, li').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      // Only keep substantial paragraphs/items and avoid duplicates
      if (text && text.length > 15 && !paragraphs.includes(text) && paragraphs.length < 50) {
        paragraphs.push(text);
      }
    });

    // Construct a structured readable text representation
    let textParts = [];
    if (title) textParts.push(`TITLE: ${title}`);
    if (metaDescription) textParts.push(`META DESCRIPTION: ${metaDescription}`);
    
    if (headings.length > 0) {
      textParts.push('\nHEADINGS:');
      headings.forEach(h => textParts.push(`- ${h}`));
    }
    
    if (paragraphs.length > 0) {
      textParts.push('\nBODY CONTENT:');
      paragraphs.forEach(p => textParts.push(p));
    }

    const textContent = textParts.join('\n');

    return {
      title,
      headings,
      paragraphs,
      textContent: textContent.substring(0, 10000) // Cap text length at 10k characters
    };
  } catch (error) {
    console.warn(`Warning: Could not scrape landing page ${url}: ${error.message}`);
    return {
      title: '',
      headings: [],
      paragraphs: [],
      textContent: `Failed to fetch or parse landing page context due to error: ${error.message}. Please rely strictly on existing ad copy details and generate general industry alternatives.`
    };
  }
}
