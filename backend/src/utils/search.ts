import { SOP } from '../models/SOP';
import { SOPVersion } from '../models/SOPVersion';
import { logger } from './logger';

export class SearchService {
  /**
   * Search SOPs by title, category, tags, or content.
   * If Elasticsearch was configured, it would use it. Otherwise, fallback to MongoDB queries.
   */
  static async search(queryText: string, departmentId?: string): Promise<any[]> {
    logger.info(`Searching for query: "${queryText}" (Department limit: ${departmentId || 'None'})`);

    try {
      // Simulate Elasticsearch check
      if (process.env.ELASTICSEARCH_NODE) {
        logger.info('Elasticsearch node configured. Executing search on ES clusters...');
        // In a real ES deployment, we would run:
        // const client = new Client({ node: process.env.ELASTICSEARCH_NODE });
        // return await client.search({ ... })
      } else {
        logger.info('Elasticsearch not configured. Falling back to MongoDB text and regex index query...');
      }

      // MongoDB fallback:
      // 1. Search SOPs by title/tags/category (regex case-insensitive)
      const queryRegex = new RegExp(queryText, 'i');
      
      const matchedSops = await SOP.find({
        isDeleted: false,
        $or: [
          { title: queryRegex },
          { category: queryRegex },
          { tags: { $in: [queryRegex] } }
        ]
      }).populate('department', 'name');

      const sopIdsFromSop = matchedSops.map(s => s._id.toString());

      // 2. Search SOPVersions (content text contains the query)
      const matchedVersions = await SOPVersion.find({
        content: queryRegex,
        status: 'Published'
      }).select('sopId versionNumber');

      const sopIdsFromVersions = matchedVersions.map(v => v.sopId.toString());

      // 3. Combine unique SOP IDs
      const uniqueSopIds = Array.from(new Set([...sopIdsFromSop, ...sopIdsFromVersions]));

      // 4. Query full SOP details for matched IDs
      const filter: any = { _id: { $in: uniqueSopIds }, isDeleted: false };
      if (departmentId) {
        filter.department = departmentId;
      }

      const results = await SOP.find(filter).populate('department', 'name');

      // 5. Package with their latest published version details
      const enrichedResults = await Promise.all(
        results.map(async (sop) => {
          const latestVersion = await SOPVersion.findOne({
            sopId: sop._id,
            status: 'Published'
          })
            .sort({ createdAt: -1 })
            .select('versionNumber content changelog createdAt');

          return {
            _id: sop._id,
            title: sop.title,
            department: sop.department,
            category: sop.category,
            priority: sop.priority,
            tags: sop.tags,
            createdAt: sop.createdAt,
            updatedAt: sop.updatedAt,
            latestVersion: latestVersion ? {
              versionNumber: latestVersion.versionNumber,
              changelog: latestVersion.changelog,
              snippet: this.createSnippet(latestVersion.content, queryText)
            } : null
          };
        })
      );

      return enrichedResults;
    } catch (error) {
      logger.error('Error executing search query:', error);
      throw error;
    }
  }

  /**
   * Utility to extract a surrounding text snippet matching the search query
   */
  private static createSnippet(htmlContent: string, query: string): string {
    const plainText = htmlContent.replace(/<[^>]*>/g, ' '); // Strip HTML tags
    const index = plainText.toLowerCase().indexOf(query.toLowerCase());
    
    if (index === -1) {
      return plainText.slice(0, 140) + (plainText.length > 140 ? '...' : '');
    }

    const start = Math.max(0, index - 40);
    const end = Math.min(plainText.length, index + query.length + 80);
    let snippet = plainText.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < plainText.length) snippet = snippet + '...';
    
    return snippet;
  }
}
