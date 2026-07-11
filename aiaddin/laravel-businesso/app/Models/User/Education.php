<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Education extends Model
{
    use HasFactory;
    public $table = "user_educations";
    protected $fillable = [
        'degree_name',
        'slug',
        'short_description',
        'start_date',
        'end_date',
        'serial_number',
        'user_id',
        'language_id'
    ];
}
