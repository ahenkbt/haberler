<?php

namespace App\Services\AiWebsite\ShopManagement;

use App\Models\User\UserCoupon;
use App\Services\MasterAiGenerator;
use Carbon\Carbon;
use Illuminate\Support\Str;

class CouponService
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

      UserCoupon::where('user_id', $userId)->delete();
    }

    $couponData = $this->getCouponData();

    foreach ($couponData as $data) {
      $name = $this->ai->generateText($data['name_prompt']);

      UserCoupon::create([
        'user_id' => $this->ai->getUserId(),
        'name' => $this->extractCleanTitle($name),
        'code' => $data['code'],
        'type' => $data['type'],
        'value' => $data['value'],
        'minimum_spend' => $data['minimum_spend'],
        'start_date' => $data['start_date'],
        'end_date' => $data['end_date'],
      ]);
    }
  }

  private function getCouponData()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $today = Carbon::now();
    $businessShort = strtoupper(substr(str_replace(' ', '', $businessName), 0, 3));

    return [

      [
        'name_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a fixed amount coupon name.
                Examples: Flat Discount Coupon, Money Off Deal, Fixed Savings Offer
                Output: Just the coupon name, nothing else.
                Context: {$baseContext}",

        'code' => $businessShort . 'SAVE' . rand(10, 99),
        'type' => 'fixed',
        'value' => 20,
        'minimum_spend' => 100,
        'start_date' => $today->format('Y-m-d'),
        'end_date' => $today->copy()->addMonths(2)->format('Y-m-d'),
      ],
      [
        'name_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a big purchase coupon name.
                Examples: Big Order Discount, Large Purchase Reward, Bulk Buy Savings
                Output: Just the coupon name, nothing else.
                Context: {$baseContext}",

        'code' => 'BIGORDER' . rand(10, 99),
        'type' => 'percentage',
        'value' => 30,
        'minimum_spend' => 500,
        'start_date' => $today->format('Y-m-d'),
        'end_date' => $today->copy()->addMonths(6)->format('Y-m-d'),
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
}
