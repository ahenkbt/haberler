<?php

namespace App\Services\AiWebsite;

use App\Models\User\UserOfferBanner;
use App\Models\User\BasicSetting;
use App\Services\MasterAiGenerator;

class OfferBannerService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/offers/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {

    // Delete old records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();
      $oldBanners = UserOfferBanner::where('user_id', $userId)->get();

      foreach ($oldBanners as $banner) {
        if ($banner->image && file_exists(public_path($this->imageStoragePath . $banner->image))) {
          @unlink(public_path($this->imageStoragePath . $banner->image)); 
        }
      }

      UserOfferBanner::where('user_id', $userId)->delete();
    }

    $theme = $this->ai->getTheme();

    $bannerData = $this->getBannerData();

    foreach ($bannerData as $index => $data) {
      $bannerInput = [
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'position' => $data['position'],
        'url' => $data['url'],
      ];

      // Generate banner image
      $image = $this->ai->generateImage(
        $data['image_prompt'],
        1200,
        400,
        $this->imageStoragePath
      );
      $bannerInput['image'] = $image;

      // Generate content based on theme
      if ($theme == 'home_fourteen') {
        $btnName = $this->ai->generateText($data['btn_name_prompt']);
        $bannerInput['btn_name'] = $this->extractCleanTitle($btnName);
        $bannerInput['text_1'] = null;
        $bannerInput['text_2'] = null;
        $bannerInput['text_3'] = null;
      } else {
        $text1 = $this->ai->generateText($data['text_1_prompt']);
        $text2 = $this->ai->generateText($data['text_2_prompt']);
        $text3 = $this->ai->generateText($data['text_3_prompt']);

        $bannerInput['text_1'] = $this->extractCleanTitle($text1);
        $bannerInput['text_2'] = $this->extractCleanTitle($text2);
        $bannerInput['text_3'] = $this->extractCleanTitle($text3);
        $bannerInput['btn_name'] = null;
      }

      UserOfferBanner::create($bannerInput);
    }
  }

  private function getBannerData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $banners = [];

    // Position 1 - Main promotional offer
    $banners[] = [
      'position' => 1,
      'url' => '/services',

      'text_1_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
            Generate a catchy headline for a promotional banner announcing a special offer.
            Make it attention-grabbing and exciting.
            Examples: Limited Time Special Offer, Exclusive Deal For You, Amazing Discount Inside
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_2_prompt' => "You must return ONLY 5-8 words. No formatting, no explanation.
            Generate a secondary text describing the offer benefit or urgency.
            Examples: Get Up To 50 Percent Off, Save Big On Premium Services, Don't Miss This Opportunity
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_3_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
            Generate a call-to-action phrase for the offer banner.
            Examples: Shop Now, Claim Offer, Get Started, Learn More
            Output: Just the CTA text, nothing else.",

      'btn_name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a button text for the promotional banner.
            Examples: Grab Deal, Shop Now, Claim Offer, Get Started
            Output: Just the button text, nothing else.",

      'image_prompt' => "Promotional offer banner design for {$industry} business, eye-catching sale advertisement, vibrant colors, modern e-commerce banner style, special deal promotion, professional marketing design",
    ];

    // Position 2 - Seasonal or service highlight
    $banners[] = [
      'position' => 2,
      'url' => '/shop',

      'text_1_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
            Generate a headline for a seasonal or new arrival banner.
            Examples: New Collection Just Arrived, Spring Season Sale, Fresh Products Available
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_2_prompt' => "You must return ONLY 5-8 words. No formatting, no explanation.
            Generate descriptive text about new products or seasonal offerings.
            Examples: Discover Latest Trends And Styles, Explore Our Newest Product Range, Quality Products For Every Need
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_3_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
            Generate a call-to-action for exploring new products.
            Examples: Explore Now, View Collection, See More, Browse All
            Output: Just the CTA text, nothing else.",

      'btn_name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a button text for new arrivals.
            Examples: View Now, Explore Collection, Shop Latest
            Output: Just the button text, nothing else.",

      'image_prompt' => "New arrival banner design for {$industry} products, modern fresh style, seasonal collection promotion, attractive product showcase banner, professional e-commerce design",
    ];

    // Position 3 - Free shipping or value proposition
    $banners[] = [
      'position' => 3,
      'url' => '/contact',

      'text_1_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
            Generate a headline highlighting a business benefit or value.
            Examples: Free Shipping On Orders, Quality Service Guaranteed, Premium Support Available
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_2_prompt' => "You must return ONLY 5-8 words. No formatting, no explanation.
            Generate supporting text about the business advantage.
            Examples: Fast Delivery To Your Doorstep, Expert Team Ready To Help, Satisfaction Guaranteed Or Money Back
            Output: Just the text, nothing else.
            Context: {$baseContext}",

      'text_3_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
            Generate a call-to-action for engagement.
            Examples: Learn More, Contact Us, Get Details, Find Out
            Output: Just the CTA text, nothing else.",

      'btn_name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
            Generate a button text for customer engagement.
            Examples: Contact Now, Learn More, Get Info
            Output: Just the button text, nothing else.",

      'image_prompt' => "Value proposition banner for {$industry} business, trust and quality message, customer benefit highlight, professional service banner, modern corporate design style",
    ];

    return $banners;
  }

  private function extractCleanTitle($text)
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);

    // Limit to 100 characters as per validation
    if (strlen($text) > 100) {
      $text = substr($text, 0, 100);
    }

    return trim($text);
  }
}
