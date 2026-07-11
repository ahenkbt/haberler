<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\Job;
use App\Models\User\Jcategory;
use App\Services\AiWebsite\HomePage\JobCategoryService;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class JobService
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
                // delete old job records
                if ($this->isDeleteOldRecords) {
                        $userId = $this->ai->getUserId();

                        Job::where('user_id', $userId)->delete();
                }

                // Get first available job category
                $category = Jcategory::where('user_id', $this->ai->getUserId())
                        ->where('language_id', $this->ai->getDefaultLanguageId())
                        ->first();

                if (!$category) {
                        // Generate categories first if none exist
                        $categoryService = new JobCategoryService($this->ai);
                        $categoryService->generate();
                        $category = Jcategory::where('user_id', $this->ai->getUserId())->first();
                }

                $jobData = $this->getJobData($category->id);

                foreach ($jobData as $index => $data) {
                        $title = $this->ai->generateText($data['title_prompt']);
                        $cleanTitle = $this->extractCleanTitle($title);

                        $responsibilities = $this->ai->generateText($data['responsibilities_prompt']);
                        $education = $this->ai->generateText($data['education_prompt']);
                        $experienceReq = $this->ai->generateText($data['experience_req_prompt']);
                        $additional = $this->ai->generateText($data['additional_prompt']);
                        $benefits = $this->ai->generateText($data['benefits_prompt']);
                        $readBefore = $this->ai->generateText($data['read_before_prompt']);

                        Job::create([
                                'user_id' => $this->ai->getUserId(),
                                'language_id' => $this->ai->getDefaultLanguageId(),
                                'jcategory_id' => $data['category_id'],
                                'title' => $cleanTitle,
                                'slug' => Str::slug($cleanTitle) . '-' . time() . '-' . rand(100, 999),
                                'vacancy' => $data['vacancy'],
                                'deadline' => $data['deadline'],
                                'experience' => $data['experience'],
                                'employment_status' => $data['employment_status'],
                                'job_location' => $data['job_location'],
                                'salary' => $data['salary'],
                                'email' => $data['email'],
                                'job_responsibilities' => $this->extractCleanText($responsibilities),
                                'educational_requirements' => $this->extractCleanText($education),
                                'experience_requirements' => $this->extractCleanText($experienceReq),
                                'additional_requirements' => $this->extractCleanText($additional),
                                'benefits' => $this->extractCleanText($benefits),
                                'read_before_apply' => $this->extractCleanText($readBefore),
                                'serial_number' => $index + 1,
                                'meta_keywords' => $cleanTitle . ', ' . $data['employment_status'] . ', ' . $data['job_location'],
                                'meta_description' => substr($this->extractCleanText($responsibilities), 0, 155),
                        ]);
                }
        }

        private function getJobData($categoryId)
        {
                $businessName = $this->ai->getBusinessName();
                $industry = $this->ai->getIndustry();
                $businessInfo = $this->ai->getBusinessInfo();

                $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

                // Generate deadlines 30-60 days from now
                $deadline1 = Carbon::now()->addDays(45)->format('Y-m-d');
                $deadline2 = Carbon::now()->addDays(40)->format('Y-m-d');
                $deadline3 = Carbon::now()->addDays(50)->format('Y-m-d');

                return [
                        [
                                'category_id' => $categoryId,

                                'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a professional job title for a senior position in {$industry}.
                Examples: Senior Software Engineer, Marketing Manager, UX Design Lead
                Output: Just the job title, nothing else.
                Context: {$baseContext}",

                                'vacancy' => rand(2, 5),
                                'deadline' => $deadline1,
                                'experience' => '3-5 years',
                                'employment_status' => 'Full Time',
                                'job_location' => 'Remote / Hybrid',
                                'salary' => 'Competitive (Based on Experience)',
                                'email' => 'careers@' . strtolower(str_replace(' ', '', $businessName)) . '.com',

                                'responsibilities_prompt' => "You must return EXACTLY 60-80 words in bullet point format. No formatting symbols.
                Write key job responsibilities for a senior position in {$industry}.
                Include: leadership duties, technical/strategic tasks, team collaboration, project management.
                Format: Write as plain text with line breaks, no asterisks or dashes.
                Context: {$baseContext}",

                                'education_prompt' => "You must return EXACTLY 25-35 words. No formatting.
                Write educational requirements for a senior position.
                Include: degree level, relevant fields, certifications.
                Output: Plain text only.
                Context: {$baseContext}",

                                'experience_req_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write experience requirements for 3-5 years experience level.
                Include: relevant industry experience, technical skills, proven track record.
                Output: Plain text only.
                Context: {$baseContext}",

                                'additional_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write additional requirements like soft skills, technical proficiencies, language skills.
                Output: Plain text only.
                Context: {$baseContext}",

                                'benefits_prompt' => "You must return EXACTLY 40-50 words in list format. No formatting symbols.
                Write employee benefits for this position.
                Include: health insurance, paid leave, professional development, flexible work.
                Format: Plain text with line breaks, no bullets.
                Context: {$baseContext}",

                                'read_before_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write application instructions and what candidates should prepare.
                Include: required documents, application process, timeline.
                Output: Plain text only.",
                        ],
                        [
                                'category_id' => $categoryId,

                                'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a professional job title for a mid-level position in {$industry}.
                Examples: Project Manager, Digital Marketing Specialist, Frontend Developer
                Output: Just the job title, nothing else.
                Context: {$baseContext}",

                                'vacancy' => rand(3, 6),
                                'deadline' => $deadline2,
                                'experience' => '2-4 years',
                                'employment_status' => 'Full Time',
                                'job_location' => 'On-site',
                                'salary' => 'Negotiable',
                                'email' => 'hr@' . strtolower(str_replace(' ', '', $businessName)) . '.com',

                                'responsibilities_prompt' => "You must return EXACTLY 60-80 words in bullet point format. No formatting symbols.
                Write key job responsibilities for a mid-level position in {$industry}.
                Include: day-to-day tasks, collaboration, deliverables, quality standards.
                Format: Write as plain text with line breaks, no asterisks or dashes.
                Context: {$baseContext}",

                                'education_prompt' => "You must return EXACTLY 25-35 words. No formatting.
                Write educational requirements for a mid-level position.
                Include: degree requirements, relevant fields.
                Output: Plain text only.
                Context: {$baseContext}",

                                'experience_req_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write experience requirements for 2-4 years experience level.
                Include: relevant experience, demonstrated skills, project involvement.
                Output: Plain text only.
                Context: {$baseContext}",

                                'additional_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write additional requirements focusing on technical and communication skills.
                Output: Plain text only.
                Context: {$baseContext}",

                                'benefits_prompt' => "You must return EXACTLY 40-50 words in list format. No formatting symbols.
                Write employee benefits package.
                Include: insurance, bonuses, training opportunities, work-life balance perks.
                Format: Plain text with line breaks, no bullets.
                Context: {$baseContext}",

                                'read_before_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write clear application instructions.
                Output: Plain text only.",
                        ],
                        [
                                'category_id' => $categoryId,

                                'title_prompt' => "You must return ONLY 3-5 words. No formatting, no explanation.
                Generate a professional job title for a junior position in {$industry}.
                Examples: Junior Developer, Marketing Assistant, Customer Support Executive
                Output: Just the job title, nothing else.
                Context: {$baseContext}",

                                'vacancy' => rand(4, 8),
                                'deadline' => $deadline3,
                                'experience' => '1-2 years',
                                'employment_status' => 'Full Time',
                                'job_location' => 'Hybrid',
                                'salary' => 'As per company policy',
                                'email' => 'jobs@' . strtolower(str_replace(' ', '', $businessName)) . '.com',

                                'responsibilities_prompt' => "You must return EXACTLY 60-80 words in bullet point format. No formatting symbols.
                Write key job responsibilities for a junior position in {$industry}.
                Include: learning opportunities, support tasks, basic duties, team assistance.
                Format: Write as plain text with line breaks, no asterisks or dashes.
                Context: {$baseContext}",

                                'education_prompt' => "You must return EXACTLY 25-35 words. No formatting.
                Write educational requirements for a junior position.
                Include: minimum degree, fresh graduates welcome.
                Output: Plain text only.
                Context: {$baseContext}",

                                'experience_req_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write experience requirements for 1-2 years or fresh graduates.
                Include: internships count, willingness to learn, basic skills.
                Output: Plain text only.
                Context: {$baseContext}",

                                'additional_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write additional requirements focusing on attitude, learning ability, teamwork.
                Output: Plain text only.
                Context: {$baseContext}",

                                'benefits_prompt' => "You must return EXACTLY 40-50 words in list format. No formatting symbols.
                Write benefits emphasizing growth opportunities and learning.
                Include: training programs, mentorship, career growth, standard benefits.
                Format: Plain text with line breaks, no bullets.
                Context: {$baseContext}",

                                'read_before_prompt' => "You must return EXACTLY 30-40 words. No formatting.
                Write welcoming application instructions for junior candidates.
                Output: Plain text only.",
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
                $text = preg_replace('/^(Here are|Here is|Sure).*/i', '', $text);
                $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
                $text = preg_replace('/^[\s\-•]+/m', '', $text);
                $text = preg_replace('/\s+/', ' ', $text);
                return trim($text);
        }
}
