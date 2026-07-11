<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserPaymentGeteway extends Model
{
    use HasFactory;
    protected $fillable = ['title', 'user_id', 'details', 'keyword', 'subtitle', 'name', 'type', 'information'];
    protected $table = 'user_payment_gateways';

    public function convertAutoData()
    {
        return json_decode($this->information, true);
    }
}
