<?php

namespace App\Services\AiWebsite\CourseManagement;

use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\Language;
use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class CourseService
{
  protected $ai;

  protected $thumbPath = 'assets/tenant/image/courses/thumbnails/';
  protected $coverPath = 'assets/tenant/image/courses/covers/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate(int $count = 3)
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();

      $oldCourses = Course::where('user_id', $userId)->get();

      foreach ($oldCourses as $course) {
        // Thumbnail image
        if ($course->thumbnail_image && $course->thumbnail_image !== 'default.jpg' && file_exists(public_path($this->thumbPath . $course->thumbnail_image))) {
          @unlink(public_path($this->thumbPath . $course->thumbnail_image));
        }

        // Cover image
        if ($course->cover_image && $course->cover_image !== 'default.jpg' && file_exists(public_path($this->coverPath . $course->cover_image))) {
          @unlink(public_path($this->coverPath . $course->cover_image));
        }
      }

      CourseInformation::whereHas('course', function ($q) use ($userId) {
        $q->where('user_id', $userId);
      })->delete();

      Course::where('user_id', $userId)->delete();
    }

    $userId        = $this->ai->getUserId();
    $defaultLangId = $this->ai->getDefaultLanguageId();

    $language = Language::where('id', $defaultLangId)
      ->where('user_id', $userId)
      ->first();

    if (!$language) {
      return;
    }

    $categories = CourseCategory::where('user_id', $userId)
      ->where('language_id', $defaultLangId)
      ->get();

    $instructors = Instructor::where('user_id', $userId)
      ->where('language_id', $defaultLangId)
      ->get();

    if ($categories->isEmpty() || $instructors->isEmpty()) {
      return;
    }

    // slug => category map
    $categoryMap = $categories->keyBy('slug');

    $definitions = $this->getCourseDefinitions($count);

    foreach ($definitions as $def) {


      $category = $categoryMap[$def['category_slug']] ?? $categories->random();


      $pricing  = $def['pricing_type']; 
      $current  = $pricing === 'free' ? 0 : $def['current_price'];
      $previous = $pricing === 'free' ? 0 : $def['previous_price'];

      $course = Course::create([
        'user_id'            => $userId,
        'thumbnail_image'    => 'default.jpg',
        'video_link'         => $this->fakeVideoLink(),
        'cover_image'        => 'default.jpg',
        'pricing_type'       => $pricing,
        'previous_price'     => $previous,
        'current_price'      => $current,
        'status'             => 'published',
        'is_featured'        => $def['is_featured'] ? 'yes' : 'no',
        'average_rating'     => $def['average_rating'],
        'duration'           => $def['duration'],
        'certificate_status' => 1,
        'video_watching'     => 80,
        'quiz_completion'    => 60,
        'certificate_title'  => $def['certificate_title'],
        'certificate_text'   => $def['certificate_text'],
        'min_quiz_score'     => 60,
      ]);

      $infoPrompts = $this->getCourseInfoPrompts($course, $language, $category);

      $rawTitle = $this->ai->generateText($infoPrompts['title_prompt']);
      $title    = $this->extractLine($rawTitle, 100);

      $slug = make_slug($title);
      if (
        CourseInformation::where('user_id', $userId)
        ->where('language_id', $language->id)
        ->where('slug', $slug)
        ->exists()
      ) {
        $slug .= '-' . time() . '-' . rand(10, 99);
      }

      $rawDesc   = $this->ai->generateText($infoPrompts['description_prompt']);
      $desc      = $this->extractText($rawDesc, 800);

      $rawMetaKw = $this->ai->generateText($infoPrompts['meta_keywords_prompt']);
      $metaKw    = $this->extractText($rawMetaKw, 200);

      $rawMetaDs = $this->ai->generateText($infoPrompts['meta_description_prompt']);
      $metaDs    = $this->extractText($rawMetaDs, 200);

      $rawThanks = $this->ai->generateText($infoPrompts['thanks_prompt']);
      $thanks    = $this->extractText($rawThanks, 400);

      $features  = $this->ai->generateText($infoPrompts['features_prompt']);
      $features  = $this->extractText($features, 400);

      $thumbPrompt = $this->buildThumbPrompt($title, $def, $category);
      $coverPrompt = $this->buildCoverPrompt($title, $def, $category);

      $thumbName = $this->ai->generateImage(
        $thumbPrompt,
        370,
        250,
        $this->thumbPath
      );

      $coverName = $this->ai->generateImage(
        $coverPrompt,
        1920,
        550,
        $this->coverPath
      );

      $course->update([
        'thumbnail_image' => $thumbName,
        'cover_image'     => $coverName,
      ]);

      CourseInformation::create([
        'language_id'        => $language->id,
        'user_id'            => $userId,
        'course_category_id' => $category->id,
        'course_id'          => $course->id,
        'title'              => $title,
        'slug'               => $slug,
        'instructor_id'      => $instructors->random()->id,
        'features'           => $features,
        'description'        => $desc,
        'meta_keywords'      => $metaKw,
        'meta_description'   => $metaDs,
        'thanks_page_content' => $thanks,
      ]);
    }
  }

  private function getCourseDefinitions(int $count): array
  {
    $businessName = $this->ai->getBusinessName();
    $industry     = $this->ai->getIndustry();
    $info         = $this->ai->getBusinessInfo();

    $baseContext  = "{$businessName} provides {$industry}-related courses and training. {$info}";

    $base = [
      [
        'pricing_type'     => 'premium',
        'current_price'    => 59,
        'previous_price'   => 99,
        'is_featured'      => true,
        'average_rating'   => 4.7,
        'duration'         => '08:30:00',
        'certificate_title' => 'Certificate of Completion',
        'certificate_text' => 'This certificate is awarded for successfully completing the full course and assessments.',
        'category_slug'    => 'programming-development',
      ],
      [
        'pricing_type'     => 'premium',
        'current_price'    => 29,
        'previous_price'   => 49,
        'is_featured'      => true,
        'average_rating'   => 4.5,
        'duration'         => '04:15:00',
        'certificate_title' => 'Professional Skills Certificate',
        'certificate_text' => 'Awarded to learners who complete all modules and pass the final quiz with required score.',
        'category_slug'    => 'marketing-business',
      ],
      [
        'pricing_type'     => 'free',
        'current_price'    => 0,
        'previous_price'   => 0,
        'is_featured'      => false,
        'average_rating'   => 4.3,
        'duration'         => '02:00:00',
        'certificate_title' => 'Introductory Course Certificate',
        'certificate_text' => 'Provides recognition for successfully completing this introductory course.',
        'category_slug'    => 'data-analytics',
      ],
    ];

    $result = [];
    for ($i = 0; $i < $count; $i++) {
      $result[] = $base[$i % count($base)];
    }

    return $result;
  }

  private function buildThumbPrompt(string $title, array $def, CourseCategory $category): string
  {
    return "flat 2D online course thumbnail icon for \"{$title}\" in {$category->name} category, " .
      "single large clear symbol or pictogram in the center representing the topic, " .
      "no real text, no small UI elements, minimal shapes, bold outline, " .
      "high contrast simple background, clean 16:9 composition, " .
      "sharp vector style, edges and icon clearly defined, not blurry";
  }

  private function buildCoverPrompt(string $title, array $def, CourseCategory $category): string
  {
    return "wide hero banner background for \"{$title}\" course in {$category->name} category, " .
      "large clear symbolic illustration or icon group on one side, " .
      "the other side kept mostly empty with smooth gradient for overlay text, " .
      "no real readable text drawn in the image, no logos, " .
      "simple shapes, clean lines, high contrast between icon and background, " .
      "1920x550 layout, modern e-learning style, not busy, not cluttered";
  }

  private function getCourseInfoPrompts(Course $course, Language $language, CourseCategory $category): array
  {
    $businessName = $this->ai->getBusinessName();
    $baseContext  = "Provider: {$businessName}. Course ID: {$course->id}. Language: {$language->name}. " .
      "This course belongs to the '{$category->name}' category.";

    return [
      'title_prompt' => "You must return ONLY 5-9 words. No formatting, no explanation.
            Generate a clear, compelling online course title that clearly fits the '{$category->name}' category.
            The topic must be strongly related to {$category->name}.
            Output: Just the title, nothing else.
            Context: {$baseContext}",

      'description_prompt' => "You must return 140-200 words. No formatting, no explanation.
            Write a high-converting online course description for the '{$category->name}' course.
            Include: who this course is for, main skills learned, key modules, outcomes and benefits.
            Tone: friendly, professional, motivating.
            Output: Plain text only, 140-200 words.
            Context: {$baseContext}",

      'features_prompt' => "You must return 5-7 short bullet-style features separated by semicolons. No bullet characters, no formatting.
            Focus on features relevant to {$category->name}.
            Output: Just the feature items separated by semicolons.
            Context: {$baseContext}",

      'meta_keywords_prompt' => "You must return ONLY 6-8 SEO keywords separated by commas. No formatting.
            Generate SEO keywords for this {$category->name} online course.
            Include: topic, level, main tool/skill, course type.
            Output: Comma-separated keywords only.
            Context: {$baseContext}",

      'meta_description_prompt' => "You must return EXACTLY 145-155 characters. No formatting.
            Write an SEO meta description for this {$category->name} course.
            Highlight: target audience, main benefit, call to enroll.
            Output: Plain text only, 145-155 characters.
            Context: {$baseContext}",

      'thanks_prompt' => "You must return 60-100 words. No formatting, no explanation.
            Write a friendly thank you message for the course thank-you page after enrollment.
            Include: gratitude, what to do next, how to start lessons.
            Output: Plain text only, 60-100 words.
            Context: {$baseContext}",
    ];
  }

  private function fakeVideoLink(): string
  {
    $id = Str::random(11);
    return "https://www.youtube.com/watch?v={$id}";
  }

  private function extractLine(string $text, int $maxLen): string
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

  private function extractText(string $text, int $maxLen): string
  {
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly|Options:)/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]<>]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);

    if (strlen($text) > $maxLen) {
      $text = substr($text, 0, $maxLen);
    }

    return $text;
  }
}
