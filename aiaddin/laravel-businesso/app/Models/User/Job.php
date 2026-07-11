<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    public $table="user_jobs";

    protected $fillable = [
        'jcategory_id',
        'language_id',
        'user_id',
        'title',
        'slug',
        'vacancy',
        'deadline',
        'experience',
        'job_responsibilities',
        'employment_status',
        'educational_requirements',
        'experience_requirements',
        'additional_requirements',
        'job_location',
        'salary',
        'benefits',
        'read_before_apply',
        'email',
        'serial_number',
        'meta_keywords',
        'meta_description'
    ];

    public function jcategory()
    {
        return $this->belongsTo(Jcategory::class);
    }

    public function language()
    {
        return $this->belongsTo(Language::class);
    }
}
