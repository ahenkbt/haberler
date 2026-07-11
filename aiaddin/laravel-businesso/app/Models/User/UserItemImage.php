<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserItemImage extends Model
{
    use HasFactory;
    protected $table = 'user_item_images';

    protected $guarded = [];


    public function item()
    {
        return $this->belongsTo(UserItem::class);
    }
}
