<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    use HasFactory;

    protected $table = 'user_lessons';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'module_id',
        'language_id',
        'user_id',
        'title',
        'status',
        'serial_number',
        'duration',
        'completion_status'
    ];

    public function module()
    {
        return $this->belongsTo(Module::class, 'module_id');
    }

    public function content()
    {
        return $this->hasMany(LessonContent::class, 'lesson_id');
    }

    public function quiz()
    {
        return $this->hasMany(LessonQuiz::class);
    }

    public function lesson_complete()
    {
        return $this->hasMany(LessonComplete::class, 'lesson_id', 'id');
    }
    public function lessonContentComplete(){
        return $this->hasMany(LessonContentComplete::class, 'lesson_id', 'id');
    }
}
