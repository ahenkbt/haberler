<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Subscriber extends Model
{
    protected $table = 'user_subscribers';

    protected $fillable = [
        'email',
        'user_id'
    ];

}
