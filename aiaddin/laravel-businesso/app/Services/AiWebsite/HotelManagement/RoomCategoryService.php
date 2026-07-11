<?php

namespace App\Services\AiWebsite\HotelManagement;

use App\Models\User\HotelBooking\RoomCategory;
use App\Services\MasterAiGenerator;

class RoomCategoryService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  /**
   * Generate multiple room categories for current user + default language.
   */
  public function generate()
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      RoomCategory::where('user_id', $userId)->delete();
    }

    $defs = $this->getCategoryDefinitions();

    foreach ($defs as $index => $def) {
      $rawName = $this->ai->generateText($def['name_prompt']);
      $name    = $this->extractCleanName($rawName);

      RoomCategory::create([
        'user_id'       => $this->ai->getUserId(),
        'language_id'   => $this->ai->getDefaultLanguageId(),
        'name'          => $name,
        'status'        => 1,
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getCategoryDefinitions(): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} is a hotel / accommodation business. Generate clear, guest‑friendly room category names.";

    return [
      [
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a standard entry-level hotel room category name.
                Examples: Standard Room, Classic Room, Comfort Room
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a slightly upgraded room category name.
                Examples: Superior Room, Premium Room, Comfort Plus Room
                Output: Just the category name, nothing else.
                Context: {$baseContext}",
      ],
      [
        'name_prompt' => "You must return ONLY 2-4 words. No formatting, no explanation.
                Generate a deluxe room category name.
                Examples: Deluxe Room, Deluxe City View, Deluxe King Room
                Output: Just the category name, nothing else.
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

    if (strlen($text) > 60) {
      $text = substr($text, 0, 60);
    }

    return $text;
  }
}
