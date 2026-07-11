<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\Brand;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Facades\Auth;

class BrandService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/brands/';
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

      $oldBrands = Brand::where('user_id', $userId)->get();

      foreach ($oldBrands as $brand) {
        if ($brand->brand_img && file_exists(public_path($this->imageStoragePath . $brand->brand_img))) {
          @unlink(public_path($this->imageStoragePath . $brand->brand_img)); 
        }
      }
      Brand::where('user_id', $userId)->delete();

    } 

    $brandData = $this->getBrandData();

    foreach ($brandData as $index => $data) {
      $brandImage = $this->ai->generateImage(
        $data['image_prompt'],
        400,
        150,
        $this->imageStoragePath
      );

      Brand::create([
        'user_id' => $this->ai->getUserId(),
        'brand_img' => $brandImage,
        'brand_url' => $data['url'],
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getBrandData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'image_prompt' => "Professional minimalist logo design for a partner brand in {$industry} industry, clean and modern style, white background, high quality corporate branding, simple geometric shapes",
        'url' => '#',
      ],
      [
        'image_prompt' => "Premium tech company logo design related to {$industry} sector, modern typography, professional business branding, white or light background, clean minimalist style",
        'url' => '#',
      ],
      [
        'image_prompt' => "Corporate brand logo for {$industry} partner company, elegant and professional design, simple icon with text, white background, business quality branding",
        'url' => '#',
      ],

    ];
  }
}
