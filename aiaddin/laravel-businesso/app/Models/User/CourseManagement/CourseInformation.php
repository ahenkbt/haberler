<?php

namespace App\Models\User\CourseManagement;

use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Models\User\Language;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseInformation extends Model
{
    use HasFactory;

    protected $table = 'user_course_informations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'language_id',
        'user_id',
        'course_category_id',
        'course_id',
        'title',
        'slug',
        'instructor_id',
        'features',
        'description',
        'meta_keywords',
        'meta_description',
        'thanks_page_content'
    ];

    public function language()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }

    public function courseCategory()
    {
        return $this->belongsTo(CourseCategory::class, 'course_category_id');
    }

    public function course()
    {
        return $this->belongsTo(Course::class, 'course_id');
    }

    public function instructor()
    {
        return $this->belongsTo(Instructor::class, 'instructor_id');
    }

    public function instructorInfo()
    {
        return $this->belongsTo(Instructor::class, 'instructor_id');
    }

    public function module()
    {
        return $this->hasMany(Module::class);
    }
}
