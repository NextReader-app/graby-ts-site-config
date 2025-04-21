import { describe, test, expect } from '@jest/globals';
import { parseConfigFile } from '../SiteConfigParser';

describe('SiteConfigParser', () => {
  test('parses empty config correctly', () => {
    const config = parseConfigFile('', 'empty');
    expect(config).toEqual({});
  });

  test('ignores comments and empty lines', () => {
    const configText = `
      # This is a comment
      
      title: Test Title
      # Another comment
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      title: ['Test Title']
    });
  });

  test('parses array values correctly', () => {
    const configText = `
      title: First Title
      title: Second Title
      body: Main Content
      body: Additional Content
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      title: ['First Title', 'Second Title'],
      body: ['Main Content', 'Additional Content']
    });
  });

  test('parses boolean values correctly', () => {
    const configText = `
      prune: yes
      autodetect_on_failure: true
      skip_json_ld: no
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      prune: true,
      autodetect_on_failure: true,
      skip_json_ld: false
    });
  });

  test('parses function-like directives correctly', () => {
    const configText = `
      http_header(User-Agent): Mozilla/5.0
      http_header(Referer): http://example.com
      replace_string(foo): bar
      wrap_in(blockquote): //div[@class="quote"]
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      http_header: {
        'user-agent': 'Mozilla/5.0',
        'referer': 'http://example.com'
      },
      find_string: ['foo'],
      replace_string: ['bar'],
      wrap_in: {
        'blockquote': '//div[@class="quote"]'
      }
    });
  });

  test('ignores directives in the ignored list', () => {
    const configText = `
      parser: custom
      tidy: yes
      not_logged_in_xpath: //div[@class="login"]
      test_url: http://example.com/test
      move_into(//span): //div
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({});
  });

  test('handles strip_attr as alias for strip', () => {
    const configText = `
      strip: //div[@class="ads"]
      strip_attr: @data-tracking
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      strip: ['//div[@class="ads"]', '@data-tracking']
    });
  });

  test('handles mismatched find_string and replace_string', () => {
    // Mock console.warn
    const originalWarn = console.warn;
    console.warn = jest.fn();

    const configText = `
      find_string: search
      # Missing replace_string
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      find_string: [],
      replace_string: []
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('find_string & replace_string size mismatch')
    );

    // Restore console.warn
    console.warn = originalWarn;
  });
  
  test('correctly handles empty replace_string value', () => {
    const configText = `
      find_string: class="views-field-field-teaser-value"
      replace_string: 
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      find_string: ['class="views-field-field-teaser-value"'],
      replace_string: ['']
    });
  });
  
  test('correctly handles empty function-style replace_string value', () => {
    const configText = `
      replace_string(class="views-field-field-teaser-value"): 
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      find_string: ['class="views-field-field-teaser-value"'],
      replace_string: ['']
    });
  });

  test('correctly handles src_lazy_load_attr', () => {
    const configText = `
      src_lazy_load_attr: data-src
      src_lazy_load_attr: data-original
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      src_lazy_load_attr: ['data-src', 'data-original']
    });
  });

  test('correctly handles if_page_contains', () => {
    const configText = `
      if_page_contains: //div[@class="pagination"]
      single_page_link: //a[@class="print"]
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      if_page_contains: ['//div[@class="pagination"]'],
      single_page_link: ['//a[@class="print"]']
    });
  });

  test('parses complex config correctly', () => {
    const configText = `
      # Example configuration
      title: //h1[@class="entry-title"]
      body: //div[@class="entry-content"]
      date: //time[@class="published"]
      strip_id_or_class: sidebar
      strip_id_or_class: footer
      strip_image_src: /wp-content/uploads/ads/
      prune: yes
      skip_json_ld: true
      http_header(User-Agent): Mozilla/5.0
      replace_string(AdBlock): Content Blocker
      src_lazy_load_attr: data-lazy-src
    `;
    
    const config = parseConfigFile(configText, 'test');
    expect(config).toEqual({
      title: ['//h1[@class="entry-title"]'],
      body: ['//div[@class="entry-content"]'],
      date: ['//time[@class="published"]'],
      strip_id_or_class: ['sidebar', 'footer'],
      strip_image_src: ['/wp-content/uploads/ads/'],
      prune: true,
      skip_json_ld: true,
      http_header: {
        'user-agent': 'Mozilla/5.0'
      },
      find_string: ['AdBlock'],
      replace_string: ['Content Blocker'],
      src_lazy_load_attr: ['data-lazy-src']
    });
  });
});