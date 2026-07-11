<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserItemVariation extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function itemContenet()
    {
        return $this->belongsTo(UserItemContent::class);
    }
    public function language()
    {
        return $this->belongsTo(Language::class);
    }

}
