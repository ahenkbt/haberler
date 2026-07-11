<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonContent extends Model
{
    use HasFactory;

    protected $table = 'user_lesson_contents';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'lesson_id',
        'user_id',
        'video_unique_name',
        'video_original_name',
        'video_duration',
        'file_unique_name',
        'file_original_name',
        'text',
        'code',
        'type',
        'order_no',
        'completion_status',
        'video_preview'
    ];

    public function lesson()
    {
        return $this->belongsTo(Lesson::class, 'lesson_id');
    }

    public function quiz()
    {
        return $this->hasMany(LessonQuiz::class, 'lesson_content_id');
    }
}
