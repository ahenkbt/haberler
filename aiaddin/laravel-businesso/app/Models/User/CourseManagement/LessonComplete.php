<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonComplete extends Model
{
    use HasFactory;
    
    protected $table = 'user_lesson_complete';
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    public function customer()
    {
        return $this->belongsTo('App\Models\Customer');
    }

    public function lesson()
    {
        return $this->belongsTo('App\Models\User\Curriculum\Lesson');
    }
}
