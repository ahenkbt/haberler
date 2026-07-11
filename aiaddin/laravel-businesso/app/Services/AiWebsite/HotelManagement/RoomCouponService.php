<?php

namespace App\Services\AiWebsite\HotelManagement;

use App\Models\User\HotelBooking\Coupon;
use App\Services\MasterAiGenerator;
use Carbon\Carbon;

class RoomCouponService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  /**
   * Generate multiple room coupons for current user.
   */
  public function generate()
  {

    // Delete old records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      Coupon::where('user_id', $userId)->delete();
    }

    $definitions = $this->getCouponDefinitions();
    $serial = 1;

    foreach ($definitions as $def) {
      $codeRaw  = $this->ai->generateText($def['code_prompt']);
      $nameRaw  = $this->ai->generateText($def['name_prompt']);

      $code = $this->extractCode($codeRaw);
      $name = $this->extractCleanText($nameRaw);

      if (Coupon::where('user_id', $this->ai->getUserId())->where('code', $code)->exists()) {
        $code .= strtoupper(rand(10, 99));
      }

      $start  = Carbon::now()->addDays($def['start_offset_days'])->format('Y-m-d');
      $end    = Carbon::now()->addDays($def['end_offset_days'])->format('Y-m-d');

      Coupon::create([
        'user_id'     => $this->ai->getUserId(),
        'name'        => $name,
        'code'        => $code,
        'type'        => $def['type'],          
        'value'       => $def['value'],         
        'start_date'  => $start,
        'end_date'    => $end,
        'rooms'       => $def['rooms'] ? json_encode($def['rooms']) : null,
        'serial_number' => $serial,
      ]);

      $serial++;
    }
  }

  private function getCouponDefinitions(): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} is a hotel or accommodation business. Generate guest‑friendly, clear coupon info.";
    return [
      
      [
        'name_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a hotel coupon name for early bird bookings.
                Examples: Early Bird Room Discount, Book Early Save More, Advance Booking Offer
                Output: Just the name text, nothing else.
                Context: {$baseContext}",

        'code_prompt' => "You must return ONLY ONE coupon code of 6-10 characters, uppercase letters and numbers, no spaces.
                Examples: EARLY20, ADVANCE15, BOOKAHEAD10
                Output: Just the code, nothing else.",

        'type'            => 'fixed',
        'value'           => 15,
        'start_offset_days' => 0,
        'end_offset_days'   => 60,
        'rooms'           => null,        
      ],

      [
        'name_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a hotel coupon name for weekend stays.
                Examples: Weekend Getaway Deal, Stay More Save More, Weekend Special Offer
                Output: Just the name text, nothing else.
                Context: {$baseContext}",

        'code_prompt' => "You must return ONLY ONE coupon code of 6-10 characters, uppercase letters and numbers, no spaces.
                Examples: WEEKEND20, GETAWAY15, STAYFRI
                Output: Just the code, nothing else.",

        'type'            => 'percentage',
        'value'           => 20,
        'start_offset_days' => 0,
        'end_offset_days'   => 45,
        'rooms'           => null,
      ],

      [
        'name_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a hotel coupon name for long stays with a free night.
                Examples: Stay 3 Nights Pay 2, Long Stay Free Night, Extended Stay Reward
                Output: Just the name text, nothing else.
                Context: {$baseContext}",

        'code_prompt' => "You must return ONLY ONE coupon code of 6-10 characters, uppercase letters and numbers, no spaces.
                Examples: STAY3PAY2, LONGSTAY, FREEDAY
                Output: Just the code, nothing else.",

        'type'            => 'night_free', 
        'value'           => 5,            
        'start_offset_days' => 0,
        'end_offset_days'   => 90,
        'rooms'           => null,
      ],

    ];
  }

  private function extractCode(string $text): string
  {
    $text = strtoupper(trim($text));
    // remove spaces and non A-Z0-9
    $text = preg_replace('/[^A-Z0-9]/', '', $text);
    if (strlen($text) > 10) {
      $text = substr($text, 0, 10);
    }
    if ($text === '') {
      $text = 'ROOM' . rand(1000, 9999);
    }
    return $text;
  }

  private function extractCleanText(string $text): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]"<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
