<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserShippingCharge extends Model
{
    use HasFactory;
    protected $fillable = [
        'language_id',
        'user_id',
        'title',
        'text',
        'charge'
    ];
}
