<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Quote extends Model
{
    protected $table = 'user_quotes';

    protected $fillable = [
        'id',
        'name',
        'email',
        'fields',
        'status',
        'created_at',
        'updated_at'
    ];
}
