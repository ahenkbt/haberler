<?php

namespace App\Services\AiWebsite;

use App\Models\User\Portfolio;
use App\Models\User\PortfolioImage;
use App\Services\MasterAiGenerator;

class PortfolioSliderImageService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/portfolios/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(): void
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldSliderImages = PortfolioImage::whereHas('portfolio', function ($query) use ($userId) {
        $query->where('user_id', $userId);
      })->get();

      foreach ($oldSliderImages as $sliderImage) {
        if ($sliderImage->image && file_exists(public_path($this->imageStoragePath . $sliderImage->image))) {
          @unlink(public_path($this->imageStoragePath . $sliderImage->image));
        }
      }

      PortfolioImage::whereHas('portfolio', function ($query) use ($userId) {
        $query->where('user_id', $userId);
      })->delete();
    }

    $portfolios = Portfolio::where('user_id', $this->ai->getUserId())
      ->where('language_id', $this->ai->getDefaultLanguageId())
      ->get();
    foreach ($portfolios as $portfolio) {
      $imagePrompts = [
        "Additional image for portfolio titled '{$portfolio->title}'. 
        The image should complement the main image and reflect the portfolio's theme and content. 
        Ensure the image is high-quality and visually appealing.",
        "Another supplementary image for the portfolio '{$portfolio->title}'. 
        This image should provide a different perspective or highlight another aspect of the portfolio's subject matter. 
        Maintain consistency with the overall style and tone of the portfolio.",
      ];
      for ($i = 0; $i < 2; $i++) {


        // Generate image using AI
        $sliderImage = $this->ai->generateImage(
          $imagePrompts[$i],
          1200,
          800,
          $this->imageStoragePath
        );

        // Save to database
        PortfolioImage::create([
          'user_portfolio_id' => $portfolio->id,
          'image' => $sliderImage,
        ]);
      }
    }
  }
}
