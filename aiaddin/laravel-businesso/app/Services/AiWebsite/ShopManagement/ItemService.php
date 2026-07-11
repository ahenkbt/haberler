<?php

namespace App\Services\AiWebsite\ShopManagement;

use App\Models\User\UserItem;
use App\Models\User\UserItemContent;
use App\Models\User\UserItemImage;
use App\Models\User\UserItemCategory;
use App\Models\User\UserItemSubCategory;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ItemService
{
  protected $ai;
  protected $thumbnailPath = 'assets/front/img/user/items/thumbnail/';
  protected $sliderPath = 'assets/front/img/user/items/slider-images/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
 
  }

  public function generate($productType = 'physical')
  {

    //delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldSliderImages = UserItemImage::whereHas('item', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->get();

      foreach ($oldSliderImages as $sliderImage) {
        if ($sliderImage->image && file_exists(public_path($this->sliderPath . $sliderImage->image))) {
          @unlink(public_path($this->sliderPath . $sliderImage->image));
        }
      }

      $oldItems = UserItem::where('user_id', $userId)->get();

      foreach ($oldItems as $item) {
        if ($item->thumbnail && file_exists(public_path($this->thumbnailPath . $item->thumbnail))) {
          @unlink(public_path($this->thumbnailPath . $item->thumbnail));
        }
      }

      UserItemImage::whereHas('item', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->delete();

      UserItemContent::whereHas('item', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->delete();

      UserItem::where('user_id', $userId)->delete();
    }

    // Get categories and subcategories
    $categories = UserItemCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    if ($categories->isEmpty()) {
      $categoryService = new ItemCategoryService($this->ai);
      $categoryService->generate();
      $categories = UserItemCategory::where('user_id', $this->ai->getUserId())->get();
    }

    $itemData = $this->getItemData($categories, $productType);

    foreach ($itemData as $data) {
      $title = $this->ai->generateText($data['title_prompt']);
      $cleanTitle = $this->extractCleanTitle($title);
      $categoryName = $data['category_name'];
 
      $businessName = $this->ai->getBusinessName();
      $industry = $this->ai->getIndustry();


      // Fallback if title is empty
      if (empty($cleanTitle) || strlen($cleanTitle) < 3) {
        $cleanTitle = $data['category_name'];
      }

      $slug = Str::slug($cleanTitle);

      if (empty($slug)) {
        $slug = 'product-' . time() . '-' . rand(100, 999);
      }

      // Check if slug already exists
      $exists = UserItemContent::where('language_id', $this->ai->getDefaultLanguageId())
        ->where('slug', $slug)
        ->exists();

      if ($exists) {
        $slug = $slug . '-' . time() . '-' . rand(100, 999);
      }

      // Generate product content
      $summary = $this->ai->generateText($data['summary_prompt']);
      $description = $this->ai->generateText($data['description_prompt']);
      $tags = $this->ai->generateText($data['tags_prompt']);
      $metaKeywords = $this->ai->generateText($data['meta_keywords_prompt']);
      $metaDescription = $this->ai->generateText($data['meta_description_prompt']);

      $thumbnailPrompt = "Professional e-commerce product photography of {$cleanTitle}. 
      Category: {$categoryName}. 
      This product is sold by {$businessName}, a trusted {$industry}. 

      A real, tangible consumer product with high-quality physical materials such as metal, plastic, fabric, leather, or wood as appropriate for the item. 
      Isolated and perfectly centered on a pure white background. 
      Studio-grade lighting with soft shadows and natural reflections. 
      Ultra-detailed surface textures, edges, stitching, buttons, or components clearly visible. 
      Front or 3/4 angle view with sharp focus and clean composition. 
      Premium marketplace-ready style suitable for top e-commerce platforms. 
      4K ultra-high resolution.

      CRITICAL: Physical product only. No digital screens, no UI, no software visuals, no text overlays, no logos, no humans, no hands, no faces.";

      // Generate thumbnail image
      $thumbnail = $this->ai->generateImage(
        $thumbnailPrompt,
        800,
        800,
        $this->thumbnailPath
      );

      // Create main item
      $item = UserItem::create([
        'user_id' => $this->ai->getUserId(),
        'thumbnail' => $thumbnail,
        'status' => 1,
        'is_feature' => 1,
        'special_offer' => 1,
        'current_price' => $data['current_price'],
        'previous_price' => $data['previous_price'],
        'stock' => $data['stock'],
        'sku' => $data['sku'],
        'type' => 'physical',
        'download_file' => $data['download_file'] ?? null,
        'download_link' => $data['download_link'] ?? null,
      ]);

      // 4. Generate slider images with actual product title

      $sliderPrompts = [

        "Macro close-up shot of {$cleanTitle}. 
        Category: {$categoryName}. 
        Product from {$businessName}, a trusted {$industry}. 

        Show real physical build quality with ultra-detailed materials, textures, stitching, seams, edges, buttons, or components relevant to this category. 
        Studio lighting, sharp focus, white or soft neutral background. 
        High realism, premium marketplace-quality visual. 
        4K ultra-high resolution.

        CRITICAL: Physical product only. No digital content, no screens, no UI, no text overlays, no logos, no humans, no hands, no faces.",

            "Lifestyle product shot of {$cleanTitle}. 
        Category: {$categoryName}. 
        Product from {$businessName}, a trusted {$industry}. 

        Product placed naturally in a clean, modern environment suitable for this category (tabletop, shelf, room setting, or styled surface). 
        Natural daylight, realistic shadows, elegant and premium composition. 
        Product remains the only focus. 
        High realism, marketplace-ready quality. 
        4K ultra-high resolution.

        CRITICAL: Physical product only. No people, no hands, no faces, no digital screens, no UI, no text overlays, no logos."
      ];

      // Generate slider images
      for ($i = 0; $i < 2; $i++) {

        $sliderImage = $this->ai->generateImage(
          $sliderPrompts[$i],
          1200,
          1200,
          $this->sliderPath
        );

        UserItemImage::create([
          'item_id' => $item->id,
          'image' => $sliderImage,
        ]);
      }

      // Create item content
      UserItemContent::create([
        'item_id' => $item->id,
        'language_id' => $this->ai->getDefaultLanguageId(),
        'category_id' => $data['category_id'],
        'subcategory_id' => $data['subcategory_id'],
        'title' => $cleanTitle,
        'slug' => $slug,
        'summary' => $this->extractCleanText($summary),
        'description' => $this->extractCleanText($description),
        'tags' => $this->extractCleanText($tags),
        'meta_keywords' => $this->extractCleanText($metaKeywords),
        'meta_description' => $this->extractCleanText($metaDescription),
      ]);
    }
  }

  private function getItemData($categories, $productType)
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "Business Name: {$businessName}
    Industry: {$industry}
    Business Overview: {$businessInfo}
    We focus on quality, value, fast delivery, and excellent customer education through detailed guides and support.";

    $items = [];

    $selectedCategories = $categories->take(2);

    foreach ($selectedCategories as $categoryIndex => $category) {

      $subcategory = UserItemSubCategory::where('category_id', $category->id)
        ->where('user_id', $this->ai->getUserId())
        ->inRandomOrder()
        ->first();

      $subcategoryId = $subcategory?->id;
      $subcategoryName = $subcategory?->name ?? $category->name;

      $currentPrice = rand(29, 199);
      $previousPrice = $currentPrice + rand(20, 80);

      $items[] = [
        'category_id' => $category->id,
        'category_name' => $category->name,
        'subcategory_id' => $subcategoryId,
        'subcategory_name' => $subcategoryName,

        'title_prompt' => "Output ONLY a realistic, attractive product name in 4-8 words. 
        NO explanations, NO quotes, NO prefixes.

        CRITICAL: This is a real, tangible product sold by {$businessName}, a premium multi-category e-commerce brand.
        Category: {$category->name}" . ($subcategoryName !== $category->name ? " > Subcategory: {$subcategoryName}" : "") . "

        Use premium, market-friendly naming words suitable for this category, such as:
        Premium, Pro, Classic, Modern, Essential, Smart, Stylish, Durable, Advanced

        Business Context:
        {$baseContext}

        NOW OUTPUT ONLY THE PRODUCT NAME:",

        'summary_prompt' => "Write a compelling product summary in exactly 30-40 words. 
        Start directly with the text. No title or intro phrase.

        Highlight quality, design, usability, and real-life benefits that matter to customers shopping in this category.

        Category: {$category->name}

        Business Context:
        {$baseContext}",

        'description_prompt' => "Write a detailed, professional product description in 150-200 words using persuasive e-commerce language.

        Focus on:
        - Product build quality, materials, or fabric (as relevant)
        - Key features and practical benefits
        - Everyday use cases
        - Who this product is ideal for
        - Why buying from {$businessName} adds value and trust

        Include clear sections:
        - Key Features
        - Who It's For
        - Why Choose {$businessName}

        End with a confident but friendly call to action.

        Category: {$category->name}

        Business Context:
        {$baseContext}",

        'tags_prompt' => "Generate exactly 6-8 relevant product tags as a comma-separated list. 
          No explanation.

          Use buyer-intent search terms appropriate for this product category.

          Category: {$category->name}
          Business: {$businessName}",

        'meta_keywords_prompt' => "Output exactly 6-8 SEO keywords as a comma-separated list. 
        No extra text.

        Target high-intent keywords related to the product and its category.

        Include patterns like:
        best [product], premium [product], buy [product] online

        Category: {$category->name}",


        'meta_description_prompt' => "Write an SEO-optimized meta description in 140-155 characters (including spaces).

        Start directly. Make it persuasive and include {$businessName}.

        Example style:
        Shop premium quality products at {$businessName}. Trusted quality, fair pricing, fast delivery & great customer support.

        Category: {$category->name}

        Business Context:
        {$baseContext}",

        'current_price' => $currentPrice,
        'previous_price' => $previousPrice,
        'stock' => rand(15, 100),
        'sku' => 'NXG-' . str_pad($category->id, 3, '0', STR_PAD_LEFT) . str_pad(($categoryIndex + 1), 3, '0', STR_PAD_LEFT),
        'download_file' => null,
        'download_link' => null,
      ];
    }

    return $items;
  }


  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:|Choose from:)[:\s]*/i', '', $text);

    $text = preg_replace('/[*_`~\[\]#]/', '', $text);
    $text = preg_replace('/^[\s\-•\d\.]+/', '', $text);
    $lines = explode("\n", $text);
    $text = trim($lines[0]);

    $text = trim($text, '"\'');

    $text = preg_replace('/\s+/', ' ', $text);

    return trim($text);
  }

  private function extractCleanText($text)
  {

    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)[:\s]*/i', '', $text);

    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);

    $text = preg_replace('/^[\s\-•]+/m', '', $text);

    $text = preg_replace('/\s+/', ' ', $text);

    return trim($text);
  }
}
