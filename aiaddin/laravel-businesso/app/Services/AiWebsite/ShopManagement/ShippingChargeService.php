<?php

namespace App\Services\AiWebsite\ShopManagement;

use App\Models\User\UserShippingCharge;
use App\Services\MasterAiGenerator;

class ShippingChargeService
{
  protected $ai;
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

      UserShippingCharge::where('user_id', $userId)->delete();
    }
    
    $shippingData = $this->getShippingData();

    foreach ($shippingData as $data) {
      $title = $this->ai->generateText($data['title_prompt']);
      $text = $this->ai->generateText($data['text_prompt']);

      UserShippingCharge::create([
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId(),
        'title' => $this->extractCleanTitle($title),
        'text' => $this->extractCleanText($text),
        'charge' => $data['charge'],
      ]);
    }
  }

  private function getShippingData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    return [
      [
        'title_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a shipping method name for standard/regular delivery.
                Examples: Standard Shipping, Regular Delivery, Standard Post
                Output: Just the shipping method name, nothing else.",

        'text_prompt' => "You must return EXACTLY 7-10 words. No formatting, no explanation.
                Write a brief description for standard shipping option.
                Include: delivery timeframe, service type, coverage area.
                Use clear, customer-friendly language.
                Output: Plain text only, 20-25 words.
                Example: Delivered within 5-7 business days to your doorstep. Available nationwide. Perfect for regular orders with no rush.",

        'charge' => 5.00,
      ],
      [
        'title_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a shipping method name for express/fast delivery.
                Examples: Express Shipping, Fast Delivery, Priority Shipping
                Output: Just the shipping method name, nothing else.",

        'text_prompt' => "You must return EXACTLY 7-10 words. No formatting, no explanation.
                Write a brief description for express shipping option.
                Include: quick delivery timeframe, priority handling, service features.
                Use persuasive, customer-friendly language.
                Output: Plain text only, 20-25 words.
                Example: Get your order in 2-3 business days with priority handling. Expedited processing and faster delivery for urgent needs.",

        'charge' => 15.00,
      ],
    ];
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
