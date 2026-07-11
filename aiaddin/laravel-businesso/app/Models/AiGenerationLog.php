<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiGenerationLog extends Model
{
    use HasFactory;
    protected $fillable = [
        'user_id',
        'package_id',
        'ai_engine'
    ];
}
