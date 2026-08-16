# Image Generation API

Learn how to generate AI-powered images using PrimeThink's Image Generation API. This guide focuses on best practices and effective usage patterns to help you get the most out of image generation capabilities.

## Overview

The Image Generation API allows you to:
- Generate images from text descriptions (text-to-image)
- Use reference images to guide style and composition
- Retrieve previously generated images
- Control image dimensions, style, and quality

## Authentication

All API requests require authentication. See [API Authentication](API-Auth.md) for details on obtaining and using your API key.

## API Endpoints Quick Reference

For complete API specifications including all parameters, request/response formats, and error codes, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### GET `/api/v1/images/{image_id}`

Retrieves a previously generated image. Optionally resize by specifying a `width` parameter.

### POST `/api/v1/images/tti`

Generates images from text descriptions (text-to-image). Key parameters include:
- `prompt` - Text description of the image (required)
- `provider` - Provider: `auto`, `openai`, or `google` (default: user setting or `auto`)
- `size` - One of `auto`, `1024x1024`, `1536x1024`, `1024x1536`, `256x256`, `512x512`, `1792x1024`, `1024x1792` (default: `1024x1024`)
- `style` - Image style (default: `realistic`)
- `reference_images` - Array of reference image URLs
- `reference_weight` - Influence of reference images (0.0-1.0, default: 0.5)
- `count` - Number of variations to generate (1-4, default: 1)
- `negative_prompt` - What to exclude from the image
- `name` - Custom filename for the generated image (without extension)
- `folder` - Destination folder for saving (default: `images`)

## Best Practices

### Writing Effective Prompts

The quality of generated images depends heavily on how you craft your prompts. Here are proven strategies:

#### Be Specific and Detailed

Include concrete details about what you want to see. Vague prompts produce unpredictable results.

**Good Examples:**
- "A professional headshot of a woman in her 30s wearing business attire, soft natural lighting from the side, neutral gray background, sharp focus"
- "A cozy coffee shop interior with wooden furniture, warm Edison bulb lighting, plants on shelves, morning sunlight through large windows"
- "A minimalist product photo of a blue ceramic mug on a white marble surface, soft shadows, overhead view"

**Poor Examples:**
- "A woman" (too vague)
- "Coffee shop" (lacks visual details)
- "Product photo" (no specifics)

#### Structure Your Prompts

Organize prompts in this order for best results:

1. **Subject** - What is the main focus?
2. **Details** - Colors, materials, features
3. **Environment** - Setting, background, context
4. **Lighting** - Natural, artificial, mood
5. **Style** - Artistic approach or photography type
6. **Quality markers** - Technical descriptors

Example: "A red sports car [subject], gleaming metallic paint [details], on a mountain road at sunset [environment], golden hour lighting [lighting], cinematic photography style [style], high resolution, sharp focus [quality]"

#### Use Style Keywords Effectively

Add style descriptors to control the artistic approach:

- **Photography**: "professional photography", "DSLR", "bokeh", "macro lens", "aerial view"
- **Art Styles**: "oil painting", "watercolor", "digital art", "pencil sketch", "ink drawing"
- **Visual Quality**: "photorealistic", "highly detailed", "8k resolution", "crisp", "vibrant colors"
- **Mood/Tone**: "cinematic", "dramatic", "serene", "moody", "bright and airy"

#### Master Negative Prompts

Negative prompts are crucial for avoiding unwanted elements. Always include common issues:

**Essential Negatives:**
- Quality issues: "blurry", "low quality", "pixelated", "distorted", "artifacts"
- Unwanted elements: "text", "watermark", "logo", "signature"
- Composition issues: "cropped", "out of frame", "extra limbs" (for people)

**Use Case Specific:**
- Product photos: "cluttered background", "shadows", "reflections"
- Portraits: "extra fingers", "deformed", "bad anatomy"
- Landscapes: "people", "buildings" (if you want nature only)

### Working with Reference Images

Reference images are powerful tools for maintaining consistent style and composition across multiple generations.

#### When to Use References

- Maintaining brand visual consistency
- Matching a specific artistic style
- Creating variations of an existing image
- Guiding color palettes and composition

#### Reference Weight Guidelines

The `reference_weight` parameter controls how much influence reference images have:

- **0.3-0.4**: Light inspiration, mostly follow the text prompt
- **0.5-0.6**: Balanced approach (recommended starting point)
- **0.7-0.8**: Strong style matching, text prompt adds details
- **0.9-1.0**: Very close to reference style (use sparingly)

Start with 0.5 and adjust based on results. Higher weights may override important aspects of your text prompt.

#### Using Multiple References

When providing multiple reference images:
- They blend together to influence the final style
- Limit to 2-3 images for best results
- Use references with similar styles for coherent output
- Different references create interesting hybrid styles

### Choosing the Right Image Size

Select dimensions based on your specific use case:

| Use Case | Recommended Size | Aspect Ratio |
|----------|-----------------|--------------|
| Social Media Posts (Instagram) | `1024x1024` | Square |
| Twitter/X Cards | `1536x1024` | Landscape |
| Pinterest Pins | `1024x1536` | Portrait |
| Blog Headers | `1792x1024` | Wide Landscape |
| Website Banners | `1792x1024` | Wide Landscape |
| Mobile Wallpapers | `1024x1792` | Tall Portrait |
| Thumbnails | `512x512` | Small Square |
| Avatar/Profile Pictures | `512x512` | Small Square |

**Tip:** Use `auto` to let the system choose optimal dimensions based on your prompt content.

### Generating Multiple Variations

Use the `count` parameter (1-4) to generate multiple variations in a single request:

**Benefits:**
- More cost-effective than separate requests
- All variations processed simultaneously
- Easier to compare options
- Respects rate limits efficiently

**When to Use:**
- Exploring different interpretations of a concept
- A/B testing visual options
- Creating a set of related images
- Increasing chances of getting a perfect result

### Iterative Refinement Strategy

Getting the perfect image often requires iteration:

1. **Start broad** - Generate with a basic prompt to see what works
2. **Analyze results** - Identify what's good and what needs improvement
3. **Refine prompt** - Add specific details or negative prompts based on observations
4. **Use references** - If you got close, use that image as a reference for the next generation
5. **Adjust parameters** - Try different sizes or styles if needed

### Rate Limiting and Cost Management

Be strategic with your API usage:

- **Batch requests**: Use `count` parameter instead of multiple separate calls
- **Cache results**: Store and reuse generated images when appropriate
- **Iterate efficiently**: Review results before generating more variations
- **Right-size images**: Don't generate 1792x1024 if you only need 512x512
- **Test prompts**: Use smaller sizes during testing, then generate final images at full resolution

### Common Mistakes to Avoid

1. **Overly complex prompts** - Keep prompts focused; too many details can confuse the model
2. **Ignoring negative prompts** - Always specify what you don't want
3. **Wrong aspect ratio** - Choose dimensions that match your use case
4. **Inconsistent requests** - Save successful prompts for reuse and consistency
5. **Not using references** - Reference images dramatically improve consistency
6. **Skipping quality keywords** - Always include "high quality", "detailed", or similar terms

## Quick Start Examples

For complete code examples in multiple languages, see the [Interactive API Documentation](https://api.primethink.ai/pt-docs).

### Basic Image Generation

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset, golden hour lighting, highly detailed",
    "size": "1536x1024",
    "negative_prompt": "people, buildings, text, blurry"
  }' \
  --output image.png
```

### With Reference Images

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern office interior in the same style",
    "reference_images": ["https://example.com/style-ref.jpg"],
    "reference_weight": 0.6,
    "size": "1024x1024"
  }' \
  --output image.png
```

### Generate Multiple Variations

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Abstract geometric patterns, vibrant colors, modern art style",
    "size": "1024x1024",
    "count": 4
  }' \
  --output images.zip
```

### With Custom Filename

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Product hero image for marketing campaign",
    "size": "1536x1024",
    "name": "hero-banner",
    "folder": "marketing"
  }' \
  --output image.png
```

### Specify Provider

```bash
curl -X POST "https://api.primethink.ai/api/v1/images/tti" \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Photorealistic mountain landscape at golden hour",
    "provider": "openai",
    "size": "1536x1024"
  }' \
  --output image.png
```

## Need Help?

If you encounter any issues or have questions about the Image Generation API, please contact our support team at [support@primethink.ai](mailto:support@primethink.ai) or visit our [community forum](https://community.primethink.ai).
