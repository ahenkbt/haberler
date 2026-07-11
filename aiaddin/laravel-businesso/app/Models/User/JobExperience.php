<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobExperience extends Model
{
    use HasFactory;
    public $table = "user_job_experiences";

    protected $fillable = [
        'company_name',
        'designation',
        'content',
        'start_date',
        'end_date',
        'is_continue',
        'serial_number',
        'language_id',
        'user_id',
    ];
    public function language()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }
}
