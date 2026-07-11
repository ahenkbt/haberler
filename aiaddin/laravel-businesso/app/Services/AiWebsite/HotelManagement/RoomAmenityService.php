<?php

namespace App\Services\AiWebsite\HotelManagement;

use App\Models\User\HotelBooking\RoomAmenity;
use App\Services\MasterAiGenerator;

class RoomAmenityService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  /**
   * Generate multiple room amenities for current user & default language.
   */
  public function generate()
  {

    // Delete old records 
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      RoomAmenity::where('user_id', $userId)->delete();
    }

    $definitions = $this->getAmenityDefinitions();

    foreach ($definitions as $index => $def) {
      $rawName = $this->ai->generateText($def['name_prompt']);
      $name    = $this->extractCleanName($rawName);

      RoomAmenity::create([
        'user_id'      => $this->ai->getUserId(),
        'language_id'  => $this->ai->getDefaultLanguageId(),
        'name'         => $name, 
        'serial_number' => $index + 1,
      ]);
    }
  }

  /**
   * Define which amenities to generate + prompt text.
   */
  private function getAmenityDefinitions(): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} is a hotel / accommodation business. Generate guest‑friendly, simple amenity names.";

    return [
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a short amenity name for free wireless internet in hotel rooms.
                Examples: Free WiFi, High-Speed WiFi, Complimentary WiFi
                Output: Just the amenity name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a short amenity name for 24/7 room service or reception.
                Examples: 24/7 Room Service, 24-Hour Reception, Concierge Service
                Output: Just the amenity name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-3 words. No formatting, no explanation.
                Generate a short amenity name for guest parking.
                Examples: Free Parking, Secure Parking, Onsite Parking
                Output: Just the amenity name, nothing else.
                Context: {$baseContext}",
      ],

    ];
  }

  private function extractCleanName(string $text): string
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = trim($text);

    if (strlen($text) > 50) {
      $text = substr($text, 0, 50);
    }

    return $text;
  }
}
