<?php

namespace App\Services\AiWebsite;

use App\Models\User\Portfolio;
use App\Models\User\PortfolioCategory;
use App\Models\User\PortfolioImage;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PortfolioService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/portfolios/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldPortfolios = Portfolio::where('user_id', $userId)->get();

      foreach ($oldPortfolios as $portfolio) {
        if ($portfolio->image && file_exists(public_path($this->imageStoragePath . $portfolio->image))) {
          @unlink(public_path($this->imageStoragePath . $portfolio->image));
        }
      }

      Portfolio::where('user_id', $userId)->delete();
    }

    // Get first available portfolio category
    $category = PortfolioCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->first();

    if (!$category) {
      // Generate categories first if none exist
      $categoryService = new PortfolioCategoryService($this->ai);
      $categoryService->generate();
      $category = PortfolioCategory::where('user_id', $this->ai->getUserId())->first();
    }

    // Get all categories for variety
    $categories = PortfolioCategory::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();

    $portfolioData = $this->getPortfolioData($categories);
    $industry = $this->ai->getIndustry();

    foreach ($portfolioData as $index => $data) {
      $title = $this->ai->generateText($data['title_prompt']);
      $cleanTitle = $this->extractCleanTitle($title);

      $content = $this->ai->generateText($data['content_prompt']);
      $clientName = $this->ai->generateText($data['client_name_prompt']);

      $categoryName = $data['category_name']; 
      $dynamicImagePrompt = "A high-quality professional showcase image for a project titled '{$cleanTitle}'. 
                                  Category: {$categoryName}. 
                                  Industry: {$industry}. 
                                  The image should be a modern, clean, and polished visual representation of the final work, 
                                  suitable for a top-tier business portfolio, ultra-realistic, professional lighting.";

      // Generate main portfolio image
      $mainImage = $this->ai->generateImage(
        $dynamicImagePrompt,
        1200,
        800,
        $this->imageStoragePath
      );

      // Create portfolio
      $portfolio = Portfolio::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'category_id' => $data['category_id'],
        'title' => $cleanTitle,
        'slug' => Str::slug($cleanTitle) . '-' . time() . '-' . rand(100, 999),
        'content' => $this->extractCleanText($content),
        'image' => $mainImage,
        'featured' => $data['featured'],
        'status' => 1,
        'client_name' => $this->extractCleanTitle($clientName),
        'start_date' => $data['start_date'],
        'submission_date' => $data['submission_date'],
        'website_link' => $data['website_link'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getPortfolioData($categories)
  {
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();
    $baseContext = "Industry: {$industry}. Info: {$businessInfo}";

    $portfolios = [];


    foreach ($categories as $index => $category) {
      $startDate = Carbon::now()->subMonths(rand(3, 12))->format('Y-m-d');
      $submissionDate = Carbon::parse($startDate)->addMonths(rand(2, 4))->format('Y-m-d');

      $portfolios[] = [
        'category_id' => $category->id,
        'category_name' => $category->name,
        'title_prompt' => "Return ONLY a 4-6 word professional project title for the '{$category->name}' category in the {$industry} industry. No extra text.",
        'content_prompt' => "Write a professional 150-word description for a {$category->name} project in the {$industry} sector. Context: {$baseContext}",
        'client_name_prompt' => "Generate a 2-3 word realistic company name for a client in the {$industry} sector.",
        'featured' => ($index < 3) ? 1 : 0, 
        'start_date' => $startDate,
        'submission_date' => $submissionDate,
        'website_link' => 'https://example-project-' . ($index + 1) . '.com',
      ];
    }

    return $portfolios;
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    return trim($text);
  }

  private function extractCleanText($text)
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/m', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
