<?php

namespace App\Models\User\CourseManagement\Instructor;

use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\Language;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Instructor extends Model
{
    use HasFactory;

    protected $table = 'user_course_instructors';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'language_id',
        'user_id',
        'image',
        'name',
        'occupation',
        'description',
        'is_featured'
    ];

    public function instructorLang()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }

    public function socialPlatform()
    {
        return $this->hasMany(SocialLink::class, 'instructor_id');
    }

    public function courseList()
    {
        return $this->hasMany(CourseInformation::class, 'instructor_id');
    }
}
