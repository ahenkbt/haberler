<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Jcategory extends Model
{
    public $table = "user_jcategories";

    protected $fillable = [
        'language_id',
        'name',
        'status',
        'serial_number',
        'user_id'
    ];

    public function jobs()
    {
        return $this->hasMany(Job::class);
    }
}
