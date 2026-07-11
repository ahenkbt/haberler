<?php

namespace App\Services\AiWebsite\CourseManagement;

use App\Models\User\CourseManagement\Coupon;
use App\Models\User\CourseManagement\Course;
use App\Services\MasterAiGenerator;
use Carbon\Carbon;
use Illuminate\Support\Str;

class CourseCouponService
{
  protected $ai;
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  /**
   * Current user er jonno 2 ta course coupon create korbe.
   */
  public function generate(int $count = 2)
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      Coupon::where('user_id', $userId)->delete();
    }

    $userId  = $this->ai->getUserId();
    $courses = Course::where('user_id', $userId)->pluck('id')->all();

    if (empty($courses)) {
      return;
    }

    $defs = $this->getCouponDefinitions($courses);

    // just first $count ta use korbo
    foreach (array_slice($defs, 0, $count) as $def) {
      $nameRaw = $this->ai->generateText($def['name_prompt']);
      $codeRaw = $this->ai->generateText($def['code_prompt']);

      $name = $this->cleanText($nameRaw, 80);
      $code = $this->cleanCode($codeRaw);

      if (Coupon::where('user_id', $userId)->where('code', $code)->exists()) {
        $code .= strtoupper(Str::random(2));
      }

      $start = Carbon::now()->addDays($def['start_offset'])->format('Y-m-d');
      $end   = Carbon::now()->addDays($def['end_offset'])->format('Y-m-d');

      Coupon::create([
        'user_id'    => $userId,
        'name'       => $name,
        'code'       => $code,
        'type'       => $def['type'],   
        'value'      => $def['value'],  
        'start_date' => $start,
        'end_date'   => $end,
        'courses'    => json_encode($def['courses']),
      ]);
    }
  }

  private function getCouponDefinitions(array $courseIds): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "{$businessName} sells online courses. Generate student‑friendly coupon offers.";

    // choto subset course nibo
    shuffle($courseIds);
    $firstCourses  = array_slice($courseIds, 0, min(3, count($courseIds)));
    shuffle($courseIds);
    $secondCourses = array_slice($courseIds, 0, min(3, count($courseIds)));

    return [

      [
        'name_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a course coupon name for a percentage discount.
                Examples: Summer Learning Sale, Limited-Time Course Discount, Skill Boost Offer
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'code_prompt' => "You must return ONLY ONE coupon code of 6-10 characters, uppercase letters and numbers, no spaces.
                Examples: LEARN20, SAVE25, COURSE15
                Output: Just the code, nothing else.",

        'type'         => 'percentage',
        'value'        => 20,
        'start_offset' => 0,
        'end_offset'   => 30,
        'courses'      => $firstCourses,
      ],


      [
        'name_prompt' => "You must return ONLY 3-6 words. No formatting, no explanation.
                Generate a course coupon name for fixed amount savings.
                Examples: Flat 10 Off Courses, Save On Premium Classes, Instant Course Savings
                Output: Just the name, nothing else.
                Context: {$baseContext}",

        'code_prompt' => "You must return ONLY ONE coupon code of 6-10 characters, uppercase letters and numbers, no spaces.
                Examples: FLAT10, SAVE5NOW, DEAL15
                Output: Just the code, nothing else.",

        'type'         => 'fixed',
        'value'        => 10,
        'start_offset' => 0,
        'end_offset'   => 45,
        'courses'      => $secondCourses,
      ],
    ];
  }

  private function cleanText(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\r?\n.*/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }

  private function cleanCode(string $text): string
  {
    $text = strtoupper(trim($text));
    $text = preg_replace('/[^A-Z0-9]/', '', $text);

    if ($text === '') {
      $text = 'COURSE' . rand(100, 999);
    }
    if (strlen($text) > 10) {
      $text = substr($text, 0, 10);
    }

    return $text;
  }
}
