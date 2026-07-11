<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    use HasFactory;

    protected $table = 'user_course_modules';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'language_id',
        'course_information_id',
        'title',
        'status',
        'serial_number',
        'duration'
    ];

    public function courseInformation()
    {
        return $this->belongsTo(CourseInformation::class, 'course_information_id');
    }

    public function lesson()
    {
        return $this->hasMany(Lesson::class);
    }
}
