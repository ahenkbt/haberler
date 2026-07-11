<?php

namespace App\Services\AiWebsite\HotelManagement;

use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomCategory;
use App\Models\User\HotelBooking\RoomAmenity;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\Language;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Facades\DB;

class RoomService
{
  protected $ai;

  protected $featuredPath = 'assets/img/rooms/feature-images/';
  protected $sliderPath   = 'assets/img/rooms/slider-images/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }


  public function generate(int $count = 2)
  {

    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldRooms = Room::where('user_id', $userId)->get();

      foreach ($oldRooms as $room) {
        // featured image
        if ($room->featured_img && file_exists(public_path($this->featuredPath . $room->featured_img))) {
          @unlink(public_path($this->featuredPath . $room->featured_img));
        }

        // slider images (json array)
        if ($room->slider_imgs) {
          $sliderImages = json_decode($room->slider_imgs, true);
          if (is_array($sliderImages)) {
            foreach ($sliderImages as $sliderImage) {
              if ($sliderImage && file_exists(public_path($this->sliderPath . $sliderImage))) {
                @unlink(public_path($this->sliderPath . $sliderImage));
              }
            }
          }
        }
      }

      RoomContent::whereHas('room', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->delete();

      Room::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    // default language object
    $defaultLang = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$defaultLang) {
      return;
    }

    $categories = RoomCategory::where('user_id', $userId)
      ->where('language_id', $defaultLangId)
      ->get();

    $amenities  = RoomAmenity::where('user_id', $userId)
      ->where('language_id', $defaultLangId)
      ->get();

    for ($i = 1; $i <= $count; $i++) {
      $config = $this->getBaseRoomConfig($i);

      DB::beginTransaction();
      try {
        // featured image
        $featuredImg = $this->ai->generateImage(
          $config['featured_prompt'],
          3840,
          2560,
          $this->featuredPath
        );

        // slider images
        $sliderFiles = [];
        foreach ($config['slider_prompts'] as $prompt) {
          $sliderFiles[] = $this->ai->generateImage(
            $prompt,
            770,
            600,
            $this->sliderPath
          );
        }

        // main room row
        $room = Room::create([
          'user_id'      => $userId,
          'slider_imgs'  => json_encode($sliderFiles),
          'featured_img' => $featuredImg,
          'status'       => 1,
          'bed'          => $config['bed'],
          'bath'         => $config['bath'],
          'rent'         => $config['rent'],
          'max_guests'   => $config['max_guests'],
          'latitude'     => $config['latitude'],
          'longitude'    => $config['longitude'],
          'address'      => $config['address'],
          'phone'        => $config['phone'],
          'email'        => $config['email'],
          'quantity'     => $config['quantity'],
        ]);

        // only default language content
        $contentDef = $this->getContentDefinition($room, $defaultLang);

        $rawTitle = $this->ai->generateText($contentDef['title_prompt']);
        $title    = $this->extractCleanTitle($rawTitle);

        $rawSummary = $this->ai->generateText($contentDef['summary_prompt']);
        $summary    = $this->extractCleanText($rawSummary);

        $rawDesc = $this->ai->generateText($contentDef['description_prompt']);
        $description = $this->extractCleanText($rawDesc);

        $rawMetaKw = $this->ai->generateText($contentDef['meta_keywords_prompt']);
        $metaKeywords = $this->extractCleanText($rawMetaKw);

        $rawMetaDesc = $this->ai->generateText($contentDef['meta_description_prompt']);
        $metaDescription = $this->extractCleanText($rawMetaDesc);

        $langAmenities = $this->pickRandomAmenities($amenities);

        RoomContent::create([
          'user_id'          => $userId,
          'language_id'      => $defaultLangId,
          'room_id'          => $room->id,
          'room_category_id' => $categories->isNotEmpty() ? $categories->random()->id : null,
          'title'            => $title,
          'slug'             => make_slug($title),
          'amenities'        => json_encode($langAmenities),
          'summary'          => $summary,
          'description'      => $description,
          'meta_keywords'    => $metaKeywords,
          'meta_description' => $metaDescription,
        ]);

        DB::commit();
      } catch (\Exception $e) {
        DB::rollBack();

      }
    }
  }

  private function getBaseRoomConfig(int $index): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} is a hotel / accommodation business in {$industry}. {$info}";

    $bed        = rand(1, 3);
    $bath       = rand(1, 2);
    $maxGuests  = max(2, $bed * 2);
    $rent       = rand(40, 200);
    $quantity   = rand(3, 15);

    $latitude   = 23.7 + (mt_rand(-50, 50) / 1000);
    $longitude  = 90.4 + (mt_rand(-50, 50) / 1000);

    return [
      'bed'        => $bed,
      'bath'       => $bath,
      'max_guests' => $maxGuests,
      'rent'       => $rent,
      'quantity'   => $quantity,
      'latitude'   => $latitude,
      'longitude'  => $longitude,
      'address'    => "{$businessName} Hotel, Main Street, City",
      'phone'      => '+8801' . rand(300000000, 999999999),
      'email'      => 'booking@' . str_replace(' ', '', strtolower($businessName)) . '.com',

      'featured_prompt' => "High quality hotel room photography, {$bed} bed, modern interior, cozy lighting, clean and comfortable, {$industry} style, professional booking website image",

      'slider_prompts' => [
        "Wide angle shot of hotel room interior, bright and welcoming, {$industry} accommodation, professional photography",
        "Close-up details of bed, linens and decor, cozy atmosphere, premium comfort",
        "Bathroom view with modern fixtures, clean and stylish, hotel booking image",
        "Window or balcony view from room, attractive scenery, natural light, inviting stay",
      ],
    ] + compact('baseContext');
  }

  private function getContentDefinition(Room $room, Language $language): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "Hotel: {$businessName}. Room ID {$room->id}. Language: {$language->name}.";

    return [
      'title_prompt' => "You must return ONLY 4-8 words. No formatting, no explanation.
            Generate a compelling hotel room title for booking page.
            Examples: Deluxe King Room With City View, Cozy Standard Room For Two, Family Suite With Balcony
            Output: Just the title text, nothing else.
            Context: {$baseContext}",

      'summary_prompt' => "You must return EXACTLY 25-35 words. No formatting, no explanation.
            Write a short summary for this hotel room focusing on key benefits: size, comfort, view, main amenities.
            Output: Plain text only, 25-35 words.
            Context: {$baseContext}",

      'description_prompt' => "You must return EXACTLY 120-160 words. No formatting, no explanation.
            Write a detailed room description for booking page.
            Include: layout, bed type, bathroom, view, main amenities, ideal guests, stay experience.
            Output: Plain text only, 120-160 words.
            Context: {$baseContext}",

      'meta_keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
            Generate SEO keywords for this hotel room.
            Include: room type, bed type, view, hotel name, booking keywords.
            Output: Comma-separated keywords only.
            Context: {$baseContext}",

      'meta_description_prompt' => "You must return EXACTLY 145-155 characters. No formatting.
            Write an SEO meta description for this room.
            Mention: room type, key benefit, ideal guests, call to book.
            Output: Plain text only, 145-155 characters.
            Context: {$baseContext}",
    ];
  }

  private function pickRandomAmenities($amenities): array
  {
    if ($amenities->isEmpty()) {
      return [];
    }

    $count = min(rand(4, 8), $amenities->count());
    return $amenities->random($count)->pluck('id')->values()->toArray();
  }

  private function extractCleanTitle(string $text): string
  {
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = trim($text);

    if (strlen($text) > 255) {
      $text = substr($text, 0, 255);
    }

    return $text;
  }

  private function extractCleanText(string $text): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]"<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }
}
