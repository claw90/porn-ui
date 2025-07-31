import puppeteer from 'puppeteer';
import { db } from '../db';
import { performers, performerSearches } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  imageUrl?: string;
  source: string;
  confidence: number;
}

interface PerformerProfile {
  name: string;
  aliases: string[];
  age?: number;
  nationality?: string;
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  ethnicity?: string;
  bodyType?: string;
  socialMedia: {
    twitter?: string;
    instagram?: string;
    onlyfans?: string;
    website?: string;
  };
  websites: string[];
  biography?: string;
  careerStart?: number;
  sourceImages: string[];
  confidence: number;
}

export class PerformerSearchService {
  private browser: puppeteer.Browser | null = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async searchPerformerByImage(imagePath: string): Promise<PerformerProfile | null> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Perform reverse image search on multiple engines
      const googleResults = await this.googleReverseImageSearch(page, imagePath);
      const bingResults = await this.bingReverseImageSearch(page, imagePath);
      const yandexResults = await this.yandexReverseImageSearch(page, imagePath);
      
      // Combine and analyze results
      const allResults = [...googleResults, ...bingResults, ...yandexResults];
      const profile = await this.analyzeSearchResults(allResults);
      
      return profile;
    } catch (error) {
      console.error('Error searching performer:', error);
      return null;
    } finally {
      await page.close();
    }
  }

  private async googleReverseImageSearch(page: puppeteer.Page, imagePath: string): Promise<SearchResult[]> {
    try {
      await page.goto('https://images.google.com');
      
      // Click camera icon for reverse image search
      await page.click('[data-ved*="camera"]');
      
      // Upload image
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
      }
      
      // Wait for results
      await page.waitForSelector('.g', { timeout: 10000 });
      
      // Extract search results
      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.g');
        return Array.from(items).slice(0, 10).map(item => {
          const titleEl = item.querySelector('h3');
          const linkEl = item.querySelector('a');
          const snippetEl = item.querySelector('.VwiC3b');
          const imageEl = item.querySelector('img');
          
          return {
            title: titleEl?.textContent || '',
            url: linkEl?.href || '',
            snippet: snippetEl?.textContent || '',
            imageUrl: imageEl?.src || '',
            source: 'Google',
            confidence: 0.8
          };
        });
      });
      
      return results;
    } catch (error) {
      console.error('Google search error:', error);
      return [];
    }
  }

  private async bingReverseImageSearch(page: puppeteer.Page, imagePath: string): Promise<SearchResult[]> {
    try {
      await page.goto('https://www.bing.com/images');
      
      // Click camera icon
      await page.click('.camera');
      
      // Upload image
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
      }
      
      // Wait for results
      await page.waitForSelector('.iusc', { timeout: 10000 });
      
      // Extract results
      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.iusc');
        return Array.from(items).slice(0, 10).map(item => {
          const titleEl = item.querySelector('.inflnk');
          const imageEl = item.querySelector('img');
          
          return {
            title: titleEl?.getAttribute('aria-label') || '',
            url: titleEl?.href || '',
            snippet: '',
            imageUrl: imageEl?.src || '',
            source: 'Bing',
            confidence: 0.7
          };
        });
      });
      
      return results;
    } catch (error) {
      console.error('Bing search error:', error);
      return [];
    }
  }

  private async yandexReverseImageSearch(page: puppeteer.Page, imagePath: string): Promise<SearchResult[]> {
    try {
      await page.goto('https://yandex.com/images');
      
      // Click camera icon
      await page.click('.cbir-button');
      
      // Upload image
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
      }
      
      // Wait for results
      await page.waitForSelector('.serp-item', { timeout: 10000 });
      
      // Extract results
      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.serp-item');
        return Array.from(items).slice(0, 10).map(item => {
          const linkEl = item.querySelector('a');
          const titleEl = item.querySelector('.serp-item__title');
          const snippetEl = item.querySelector('.serp-item__text');
          const imageEl = item.querySelector('img');
          
          return {
            title: titleEl?.textContent || '',
            url: linkEl?.href || '',
            snippet: snippetEl?.textContent || '',
            imageUrl: imageEl?.src || '',
            source: 'Yandex',
            confidence: 0.9 // Yandex is often better for adult content
          };
        });
      });
      
      return results;
    } catch (error) {
      console.error('Yandex search error:', error);
      return [];
    }
  }

  private async analyzeSearchResults(results: SearchResult[]): Promise<PerformerProfile | null> {
    if (results.length === 0) return null;

    // Extract performer information from search results
    const performerData = {
      name: this.extractPerformerName(results),
      aliases: this.extractAliases(results),
      age: this.extractAge(results),
      nationality: this.extractNationality(results),
      height: this.extractHeight(results),
      weight: this.extractWeight(results),
      hairColor: this.extractHairColor(results),
      eyeColor: this.extractEyeColor(results),
      ethnicity: this.extractEthnicity(results),
      bodyType: this.extractBodyType(results),
      socialMedia: this.extractSocialMedia(results),
      websites: this.extractWebsites(results),
      biography: this.extractBiography(results),
      careerStart: this.extractCareerStart(results),
      sourceImages: results.map(r => r.imageUrl).filter(Boolean) as string[],
      confidence: this.calculateOverallConfidence(results)
    };

    return performerData;
  }

  private extractPerformerName(results: SearchResult[]): string {
    // Look for common patterns in titles and snippets
    const titles = results.map(r => r.title).join(' ');
    const snippets = results.map(r => r.snippet).join(' ');
    const text = `${titles} ${snippets}`.toLowerCase();
    
    // Extract potential names (simple pattern matching)
    const namePatterns = [
      /(?:performer|actor|model|star)[\s:]+([a-z\s]+)/gi,
      /^([a-z\s]+)(?:\s-\s|:)/gi,
      /name[\s:]+([a-z\s]+)/gi
    ];
    
    for (const pattern of namePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Unknown Performer';
  }

  private extractAliases(results: SearchResult[]): string[] {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const aliases: string[] = [];
    
    // Look for alias patterns
    const aliasPatterns = [
      /(?:also known as|aka|alias)[\s:]+([a-z\s,]+)/gi,
      /(?:formerly|previously)[\s:]+([a-z\s]+)/gi
    ];
    
    for (const pattern of aliasPatterns) {
      const match = pattern.exec(text);
      if (match) {
        aliases.push(...match[1].split(',').map(a => a.trim()));
      }
    }
    
    return [...new Set(aliases)];
  }

  private extractAge(results: SearchResult[]): number | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ');
    const ageMatch = text.match(/(?:age|born)[\s:]*(\d{1,2})/i);
    return ageMatch ? parseInt(ageMatch[1]) : undefined;
  }

  private extractNationality(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const countries = ['american', 'british', 'canadian', 'australian', 'german', 'french', 'italian', 'spanish', 'russian'];
    
    for (const country of countries) {
      if (text.includes(country)) {
        return country.charAt(0).toUpperCase() + country.slice(1);
      }
    }
    
    return undefined;
  }

  private extractHeight(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ');
    const heightMatch = text.match(/height[\s:]*(\d+(?:\.\d+)?(?:\s*(?:ft|feet|cm|m))?)/i);
    return heightMatch ? heightMatch[1] : undefined;
  }

  private extractWeight(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ');
    const weightMatch = text.match(/weight[\s:]*(\d+(?:\s*(?:lbs|kg|pounds))?)/i);
    return weightMatch ? weightMatch[1] : undefined;
  }

  private extractHairColor(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const hairColors = ['blonde', 'brunette', 'redhead', 'black', 'brown', 'red', 'gray', 'white'];
    
    for (const color of hairColors) {
      if (text.includes(color)) {
        return color.charAt(0).toUpperCase() + color.slice(1);
      }
    }
    
    return undefined;
  }

  private extractEyeColor(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const eyeColors = ['blue', 'brown', 'green', 'hazel', 'gray', 'amber'];
    
    for (const color of eyeColors) {
      if (text.includes(`${color} eyes`)) {
        return color.charAt(0).toUpperCase() + color.slice(1);
      }
    }
    
    return undefined;
  }

  private extractEthnicity(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const ethnicities = ['caucasian', 'asian', 'latino', 'hispanic', 'african', 'mixed', 'middle eastern'];
    
    for (const ethnicity of ethnicities) {
      if (text.includes(ethnicity)) {
        return ethnicity.charAt(0).toUpperCase() + ethnicity.slice(1);
      }
    }
    
    return undefined;
  }

  private extractBodyType(results: SearchResult[]): string | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    const bodyTypes = ['slim', 'athletic', 'curvy', 'petite', 'average', 'muscular'];
    
    for (const type of bodyTypes) {
      if (text.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    return undefined;
  }

  private extractSocialMedia(results: SearchResult[]): { twitter?: string; instagram?: string; onlyfans?: string; website?: string } {
    const socialMedia: any = {};
    const urls = results.map(r => r.url).join(' ');
    
    // Extract social media links
    if (urls.includes('twitter.com')) {
      const twitterMatch = urls.match(/twitter\.com\/([a-zA-Z0-9_]+)/);
      if (twitterMatch) socialMedia.twitter = `https://twitter.com/${twitterMatch[1]}`;
    }
    
    if (urls.includes('instagram.com')) {
      const instagramMatch = urls.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (instagramMatch) socialMedia.instagram = `https://instagram.com/${instagramMatch[1]}`;
    }
    
    if (urls.includes('onlyfans.com')) {
      const onlyfansMatch = urls.match(/onlyfans\.com\/([a-zA-Z0-9_]+)/);
      if (onlyfansMatch) socialMedia.onlyfans = `https://onlyfans.com/${onlyfansMatch[1]}`;
    }
    
    return socialMedia;
  }

  private extractWebsites(results: SearchResult[]): string[] {
    return results.map(r => r.url).filter(url => 
      url && !url.includes('google.com') && !url.includes('bing.com') && !url.includes('yandex.com')
    );
  }

  private extractBiography(results: SearchResult[]): string | undefined {
    const snippets = results.map(r => r.snippet).filter(s => s && s.length > 50);
    return snippets.length > 0 ? snippets[0] : undefined;
  }

  private extractCareerStart(results: SearchResult[]): number | undefined {
    const text = results.map(r => `${r.title} ${r.snippet}`).join(' ');
    const yearMatch = text.match(/(?:career|started|debut)[\s\w]*(\d{4})/i);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  private calculateOverallConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const resultCount = Math.min(results.length / 10, 1); // Normalize to 0-1
    
    return Math.min(avgConfidence * resultCount, 1);
  }

  async createPerformerFromSearch(imagePath: string): Promise<string | null> {
    try {
      // Search for performer information
      const profile = await this.searchPerformerByImage(imagePath);
      
      if (!profile) return null;
      
      // Create performer record
      const [performer] = await db.insert(performers).values({
        name: profile.name,
        aliases: profile.aliases,
        faceImagePath: imagePath,
        description: profile.biography || `Performer discovered through image search`,
        age: profile.age,
        nationality: profile.nationality,
        height: profile.height,
        weight: profile.weight,
        hairColor: profile.hairColor,
        eyeColor: profile.eyeColor,
        ethnicity: profile.ethnicity,
        bodyType: profile.bodyType,
        socialMedia: profile.socialMedia,
        websites: profile.websites,
        biography: profile.biography,
        careerStart: profile.careerStart,
        sourceImages: profile.sourceImages,
        confidence: profile.confidence,
        isVerified: profile.confidence > 0.8, // Auto-verify high confidence matches
      }).returning();
      
      return performer.id;
    } catch (error) {
      console.error('Error creating performer from search:', error);
      return null;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const performerSearchService = new PerformerSearchService();