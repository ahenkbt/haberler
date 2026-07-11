<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;
    protected $table = 'user_courses';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'thumbnail_image',
        'video_link',
        'cover_image',
        'pricing_type',
        'previous_price',
        'current_price',
        'status',
        'is_featured',
        'average_rating',
        'duration',
        'certificate_status',
        'video_watching',
        'quiz_completion',
        'certificate_title',
        'certificate_text',
        'min_quiz_score'
    ];

    public function courseInformation()
    {
        return $this->hasMany(CourseInformation::class);
    }

    public function faq()
    {
        return $this->hasMany(CourseFaq::class);
    }

    public function enrolment()
    {
        return $this->hasMany(CourseEnrolment::class, 'course_id', 'id');
    }

    public function review()
    {
        return $this->hasMany(CourseReview::class, 'course_id', 'id');
    }

    public function quizScore()
    {
        return $this->hasMany(QuizScore::class, 'course_id', 'id');
    }
}
