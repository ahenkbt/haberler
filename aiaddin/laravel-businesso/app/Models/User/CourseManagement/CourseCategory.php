<?php

namespace App\Models\User\CourseManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseCategory extends Model
{
    use HasFactory;

    protected $table = 'user_course_categories';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'language_id',
        'user_id',
        'icon',
        'color',
        'name',
        'status',
        'serial_number',
        'is_featured',
        'slug'
    ];

    public function categoryLang()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }

    public function courseInfoList()
    {
        return $this->hasMany(CourseInformation::class, 'course_category_id', 'id');
    }
}
