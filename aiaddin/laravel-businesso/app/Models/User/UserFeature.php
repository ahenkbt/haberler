<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserFeature extends Model
{
    use HasFactory;

    protected $fillable = [
        "user_id",
        "language_id",
        'color',
        'icon',
        'title',
        'text',
        'serial_number',
    ];
}
